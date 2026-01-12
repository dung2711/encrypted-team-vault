using System.Security.Claims;
using ETV.HttpModel.Request;
using ETV.HttpModel.Response;
using ETV.Services;
using ETV.src.Data;
using ETV.src.Exceptions;
using ETV.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ETV.Controllers
{
    /// <summary>
    /// Authentication endpoints
    /// Manages user registration, login, logout, and token refresh
    /// </summary>
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly TeamService _teamService;
        private readonly TokenProvider _tokenProvider;
        private readonly AppDb _db;
        private readonly ILogger<AuthController> _logger;
        private readonly IConfiguration _configuration;

        public AuthController(
            UserService userService,
            TeamService teamService,
            TokenProvider tokenProvider,
            AppDb db,
            ILogger<AuthController> logger,
            IConfiguration configuration)
        {
            _userService = userService;
            _teamService = teamService;
            _tokenProvider = tokenProvider;
            _db = db;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Register a new user with encryption keys
        /// </summary>
        /// <remarks>
        /// Creates a new user account with their public/private key pair for end-to-end encryption.
        /// The client is responsible for generating and managing the encryption keys.
        /// </remarks>
        /// <param name="request">User registration details including keys</param>
        /// <returns>Created user with ID and registration timestamp</returns>
        /// <response code="201">User successfully registered</response>
        /// <response code="400">Invalid request data or duplicate username/email</response>
        /// <response code="500">Internal server error</response>
        [HttpPost("register")]
        [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var user = await _userService.CreateUserAsync(
                    request.Username,
                    request.Email,
                    request.Password,
                    request.PublicKey,
                    request.KDFSalt
                );

                _logger.LogInformation("User {Username} registered successfully.", request.Username);

                return Created(new Uri($"{Request.Scheme}://{Request.Host}/api/auth/login"), new RegisterResponse
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    CreatedAt = user.CreatedAt.UtcDateTime
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Registration failed: {Message}", ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Login with username and password
        /// </summary>
        /// <remarks>
        /// Returns JWT access token and refresh token for authenticated requests.
        /// Store both tokens on client and use access token for API calls.
        /// </remarks>
        /// <param name="request">Username and password credentials</param>
        /// <returns>Access token, refresh token, and token expiration time</returns>
        /// <response code="200">Login successful</response>
        /// <response code="401">Invalid username or password</response>
        /// <response code="400">Bad request</response>
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new { message = "Username and password are required." });
                }

                // Verify credentials
                var user = await _userService.GetUserByUsernameAsync(request.Username);
                var verified = await _userService.VerifyPasswordByUsernameAsync(request.Username, request.Password);

                if (!verified)
                {
                    _logger.LogWarning("Invalid login attempt for user {Username}", request.Username);
                    return Unauthorized(new { message = "Invalid username or password." });
                }

                // Create access token
                var accessToken = _tokenProvider.Create(user);

                // Persist refresh token
                var (refreshToken, _) = await _tokenProvider.CreateRefreshTokenAsync(_db, user.Id);

                var expiresInSeconds = int.Parse(_configuration["JWT:EXPIRATION_MINUTES"] ?? "60") * 60;

                var response = new LoginResponse
                {
                    UserId = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresIn = expiresInSeconds,
                    PublicKey = user.PublicKey,
                    KDFSalt = user.KDFSalt
                };

                _logger.LogInformation("User {Username} logged in successfully.", request.Username);
                return Ok(response);
            }
            catch (NotFoundException)
            {
                _logger.LogWarning("Login attempt for non-existent user {Username}", request.Username);
                return Unauthorized(new { message = "Invalid username or password." });
            }
        }

        /// <summary>
        /// Refresh access token using a refresh token
        /// </summary>
        /// <remarks>
        /// Issues a new access token and refresh token pair.
        /// Old refresh token is invalidated (token rotation for security).
        /// </remarks>
        /// <param name="request">Current refresh token</param>
        /// <returns>New access token and refresh token</returns>
        /// <response code="200">Token refresh successful</response>
        /// <response code="400">Bad request or invalid token format</response>
        /// <response code="401">Refresh token invalid or expired</response>
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(RefreshTokenResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RefreshToken))
                    return BadRequest(new { message = "refreshToken is required." });

                // Find refresh token by value
                var existing = await _db.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

                if (existing == null)
                {
                    return Unauthorized(new { message = "Invalid refresh token." });
                }

                // Check if token is expired
                if (existing.ExpiresAt <= DateTimeOffset.UtcNow)
                {
                    _db.RefreshTokens.Remove(existing);
                    await _db.SaveChangesAsync();
                    _logger.LogWarning("Refresh token expired for user {UserId}", existing.UserId);
                    return Unauthorized(new { message = "Refresh token expired." });
                }

                // Load associated user
                var user = await _userService.GetUserAsync(existing.UserId);

                // Create new access token
                var accessToken = _tokenProvider.Create(user);

                // Rotate refresh token: delete old and create new
                _db.RefreshTokens.Remove(existing);
                await _db.SaveChangesAsync();

                var (newRefreshToken, _) = await _tokenProvider.CreateRefreshTokenAsync(_db, user.Id);

                var expiresInSeconds = int.Parse(_configuration["JWT:EXPIRATION_MINUTES"] ?? "60") * 60;

                var response = new RefreshTokenResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = newRefreshToken,
                    ExpiresIn = expiresInSeconds
                };

                _logger.LogInformation("Token refreshed for user {UserId}", user.Id);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return BadRequest(new { message = "An error occurred during token refresh." });
            }
        }

        /// <summary>
        /// Logout user by invalidating refresh token
        /// </summary>
        /// <remarks>
        /// Removes the user's refresh token from the system.
        /// Access token remains valid until expiration.
        /// </remarks>
        /// <param name="request">Refresh token to invalidate</param>
        /// <returns>Success message</returns>
        /// <response code="200">Logout successful</response>
        /// <response code="401">Unauthorized</response>
        [Authorize]
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RefreshToken))
                {
                    return Ok(new { message = "Logout successful." });
                }

                var refreshToken = await _db.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

                if (refreshToken != null)
                {
                    _db.RefreshTokens.Remove(refreshToken);
                    await _db.SaveChangesAsync();
                }

                _logger.LogInformation("User logged out successfully.");
                return Ok(new { message = "Logout successful." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return BadRequest(new { message = "An error occurred during logout." });
            }
        }

        /// <summary>
        /// Change user password
        /// </summary>
        /// <remarks>
        /// Changes the user's password. Requires the current password for verification.
        /// New password is hashed before storage. All existing refresh tokens are invalidated.
        /// Note: User's encryption keys (public/private) are derived from password on the client,
        /// so the user must re-derive and update their keys after password change.
        /// </remarks>
        /// <param name="request">Old and new password</param>
        /// <returns>Success message</returns>
        /// <response code="200">Password changed successfully</response>
        /// <response code="400">Invalid request or old password mismatch</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        [Authorize]
        [HttpPost("change-password")]
        [ProducesResponseType(typeof(ChangePasswordResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                // Get current user ID from JWT token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { message = "Invalid token." });
                }

                // Validate request
                if (string.IsNullOrWhiteSpace(request.OldPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    return BadRequest(new { message = "Old password and new password are required." });
                }

                if (request.OldPassword == request.NewPassword)
                {
                    return BadRequest(new { message = "New password must be different from old password." });
                }

                if (string.IsNullOrWhiteSpace(request.PublicKey) ||
                    string.IsNullOrWhiteSpace(request.KDFSalt))
                {
                    return BadRequest(new { message = "Public key and KDF salt are required." });
                }

                if (request.ReEncryptedTeamKeys == null || request.ReEncryptedTeamKeys.Count == 0)
                {
                    return BadRequest(new { message = "Re-encrypted team keys are required. You must re-encrypt all your team keys with your new public key." });
                }

                // Verify old password
                var verified = await _userService.VerifyPasswordAsync(userId, request.OldPassword);
                if (!verified)
                {
                    _logger.LogWarning("Change password failed: incorrect old password for user {UserId}", userId);
                    return BadRequest(new { message = "Old password is incorrect." });
                }

                // Hash new password
                var hashedPassword = ETV.src.Utilities.PasswordHasher.HashPassword(request.NewPassword);

                // Update password and key materials
                await _userService.UpdatePasswordAsync(userId, hashedPassword);
                await _userService.UpdateAllKeyMaterialsAsync(userId, request.PublicKey, request.KDFSalt);

                // Update all team keys for this user
                var teamKeys = request.ReEncryptedTeamKeys
                    .Select(tk => (tk.TeamId, tk.EncryptedTeamKey, tk.KeyVersion))
                    .ToList();
                await _teamService.UpdateUserTeamKeysAsync(userId, teamKeys);

                // Update personal item keys
                var itemKeys = request.ReEncryptedItemKeys
                    .Select(ik => (ik.ItemId, ik.EncryptedItemKey))
                    .ToList();

                var allItemsUpdated = await _userService.UpdateUserPersonalItemKeysAsync(userId, itemKeys);
                if (!allItemsUpdated)
                {
                    _logger.LogWarning("Not all personal items were updated for user {UserId}", userId);
                    return BadRequest(new { message = "Failed to update all personal items. Some items were not found or do not belong to this user." });
                }

                // Invalidate all refresh tokens (force re-login)
                var userRefreshTokens = await _db.RefreshTokens
                    .Where(rt => rt.UserId == userId)
                    .ToListAsync();

                _db.RefreshTokens.RemoveRange(userRefreshTokens);
                await _db.SaveChangesAsync();

                _logger.LogInformation("Password, key materials, team keys, and personal item keys changed for user {UserId}. All refresh tokens invalidated.", userId);
                return Ok(new ChangePasswordResponse { Message = "Password, key materials, team keys, and personal item keys updated successfully. Please login again with your new password." });
            }
            catch (NotFoundException)
            {
                return Unauthorized(new { message = "User not found." });
            }
            catch (ArgumentException argEx)
            {
                _logger.LogWarning("Invalid key materials: {Message}", argEx.Message);
                return BadRequest(new { message = argEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password change");
                return BadRequest(new { message = "An error occurred during password change." });
            }
        }
    }
}
