using ETV.HttpModel.Request;
using ETV.HttpModel.Response;
using ETV.src.Filters;
using ETV.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ETV.Controllers
{
    /// <summary>
    /// User management endpoints
    /// Handles user profile and key material management (authentication moved to AuthController)
    /// </summary>
    [ApiController]
    [Route("api/user")]
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
        /// Get user's encryption key materials
        /// </summary>
        /// <remarks>
        /// Returns the user's public key and KDF salt.
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
                kdfSalt = keyMaterials.KDFSalt
            });
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
}
