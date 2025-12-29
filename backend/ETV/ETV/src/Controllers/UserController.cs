using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ETV.src.Data;
using ETV.src.Exceptions;
using ETV.src.Services;
using ETV.src.Filters;

namespace ETV.src.Controllers
{
    /// <summary>
    /// User management endpoints
    /// Handles user registration, authentication, and key material management
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly ILogger<UserController> _logger;

        /// <summary>
        /// Initialize UserController with required services
        /// </summary>
        /// <param name="userService">Service for user operations</param>
        /// <param name="logger">Logger for diagnostic information</param>
        public UserController(UserService userService, ILogger<UserController> logger)
        {
            _userService = userService;
            _logger = logger;
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
        [HttpPost("auth/register")]
        [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var user = await _userService.CreateUserAsync(
                request.Username,
                request.Email,
                request.Password,
                request.PublicKey,
                request.EncryptedPrivateKey,
                request.KDFSalt
            );

            _logger.LogInformation($"User {request.Username} registered successfully.");

            return Created(new Uri($"{Request.Scheme}://{Request.Host}/api/users/{user.Id}"), new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                createdAt = user.CreatedAt
            });
        }

        /// <summary>
        /// Get user's encryption key materials
        /// </summary>
        /// <remarks>
        /// Returns the user's public key, encrypted private key, and KDF salt.
        /// This allows clients to decrypt team keys and other encrypted data.
        /// </remarks>
        /// <param name="id">User ID</param>
        /// <returns>User's key materials</returns>
        /// <response code="200">Key materials retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="404">User not found</response>
        [Authorize]
        [HttpGet("{id}/key")]
        [ValidateEntityExists<User>("id")]
        [ProducesResponseType(typeof(GetKeyMaterialsResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetKeyMaterials([FromRoute] Guid id)
        {
            var keyMaterials = await _userService.GetKeyMaterialsAsync(id);

            return Ok(new
            {
                publicKey = keyMaterials.PublicKey,
                encryptedPrivateKey = keyMaterials.EncryptedPrivateKey,
                kdfSalt = keyMaterials.KDFSalt
            });
        }

        /// <summary>
        /// Update user's encryption key materials
        /// </summary>
        /// <remarks>
        /// Updates the user's public key, encrypted private key, and/or KDF salt.
        /// Used when user rotates their keys or updates encryption parameters.
        /// </remarks>
        /// <param name="id">User ID</param>
        /// <param name="request">New key materials</param>
        /// <returns>Success message</returns>
        /// <response code="200">Key materials updated successfully</response>
        /// <response code="400">Invalid request data</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="404">User not found</response>
        [Authorize]
        [HttpPut("{id}/key")]
        [ValidateEntityExists<User>("id")]
        [ProducesResponseType(typeof(SuccessMessageResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> UpdateKeyMaterials([FromRoute] Guid id, [FromBody] UpdateKeyMaterialsRequest request)
        {
            // Cập nhật public key
            await _userService.UpdatePublicKeyAsync(id, request.PublicKey);

            // Cập nhật encrypted private key
            await _userService.UpdateEncryptedPrivateKeyAsync(id, request.EncryptedPrivateKey);

            // TODO: Cập nhật KDF salt nếu cần (thêm method UpdateKdfSaltAsync)

            _logger.LogInformation($"Key materials updated for user {id}.");

            return Ok(new { message = "Key materials updated successfully." });
        }

        /// <summary>
        /// Get user profile information
        /// </summary>
        /// <remarks>
        /// Returns basic user information including username, email, and creation timestamp.
        /// </remarks>
        /// <param name="id">User ID</param>
        /// <returns>User profile information</returns>
        /// <response code="200">User profile retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="404">User not found</response>
        [Authorize]
        [HttpGet("{id}")]
        [ValidateEntityExists<User>("id")]
        [ProducesResponseType(typeof(GetUserResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUser([FromRoute] Guid id)
        {
            var (userId, username, email, createdAt) = await _userService.GetUserInfoAsync(id);

            return Ok(new
            {
                id = userId,
                username = username,
                email = email,
                createdAt = createdAt
            });
        }
    }

    // Request/Response Models
    public class RegisterRequest
    {
        public required string Username { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string PublicKey { get; set; }
        public required string EncryptedPrivateKey { get; set; }
        public required string KDFSalt { get; set; }
    }

    public class UpdateKeyMaterialsRequest
    {
        public required string PublicKey { get; set; }
        public required string EncryptedPrivateKey { get; set; }
        public required string KDFSalt { get; set; }
    }

    public class RegisterResponse
    {
        public Guid Id { get; set; }
        public required string Username { get; set; }
        public required string Email { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GetKeyMaterialsResponse
    {
        public required string PublicKey { get; set; }
        public required string EncryptedPrivateKey { get; set; }
        public required string KDFSalt { get; set; }
    }

    public class GetUserResponse
    {
        public Guid Id { get; set; }
        public required string Username { get; set; }
        public required string Email { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
