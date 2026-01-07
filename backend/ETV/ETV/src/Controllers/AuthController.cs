using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ETV.src.Services;
using BCrypt.Net;
namespace ETV.src.Controllers
{
    /// <summary>
    /// Authentication endpoints
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;

        public AuthController(UserService userService, IConfiguration config, ILogger<AuthController> logger)
        {
            _userService = userService;
            _config = config;
            _logger = logger;
        }

        /// <summary>
        /// Login user
        /// </summary>
        /// <remarks>
        /// Authenticates user with username/email and password, returns JWT token.
        /// </remarks>
        /// <param name="request">Login credentials</param>
        /// <returns>JWT token and user info</returns>
        /// <response code="200">Login successful</response>
        /// <response code="401">Invalid credentials</response>
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                // Find user by username or email
                var user = request.UsernameOrEmail.Contains("@")
                    ? await _userService.GetUserByEmailAsync(request.UsernameOrEmail)
                    : await _userService.GetUserByUsernameAsync(request.UsernameOrEmail);

                // Verify password using BCrypt
                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                {
                    _logger.LogWarning($"Failed login attempt for user: {request.UsernameOrEmail}");
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                // Generate JWT token
                var token = GenerateJwtToken(user.Id, user.Username);

                _logger.LogInformation($"User {user.Username} logged in successfully.");

                return Ok(new
                {
                    token = token,
                    userId = user.Id,
                    username = user.Username,
                    email = user.Email
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Login failed for {request.UsernameOrEmail}: {ex.Message}");
                return Unauthorized(new { message = "Invalid credentials" });
            }
        }

        private string GenerateJwtToken(Guid userId, string username)
        {
            var jwtSettings = _config.GetSection("JWT");
            var secretKey = jwtSettings["SECRET_KEY"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
            var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var expirationMinutes = int.Parse(jwtSettings["EXPIRATION_MINUTES"] ?? "60");

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginRequest
    {
        public required string UsernameOrEmail { get; set; }
        public required string Password { get; set; }
    }

    public class LoginResponse
    {
        public required string Token { get; set; }
        public Guid UserId { get; set; }
        public required string Username { get; set; }
        public required string Email { get; set; }
    }
}