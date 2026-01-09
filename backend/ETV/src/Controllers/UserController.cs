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
        /// Get user's public key
        /// </summary>
        /// <remarks>
        /// Returns the user's public key.
        /// This allows other users to encrypt data for this user.
        /// </remarks>
        /// <param name="id">User ID</param>
        /// <returns>User's public key</returns>
        /// <response code="200">Public key retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="404">User not found</response>
        [Authorize]
        [HttpGet("{id}/publickey")]
        [ValidateEntityExists<User>("id")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPublicKey([FromRoute] Guid id)
        {
            var user = await _userService.GetUserAsync(id);

            return Ok(new
            {
                publicKey = user.PublicKey
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

        /// <summary>
        /// Update user profile information
        /// </summary>
        /// <remarks>
        /// Updates username and/or email for the user.
        /// Username and email must be unique across the system.
        /// </remarks>
        /// <param name="id">User ID</param>
        /// <param name="request">Updated username and email</param>
        /// <returns>Updated user profile</returns>
        /// <response code="200">User profile updated successfully</response>
        /// <response code="400">Invalid request data or username/email already in use</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="404">User not found</response>
        [Authorize]
        [HttpPut("{id}")]
        [ValidateEntityExists<User>("id")]
        [ProducesResponseType(typeof(GetUserResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> UpdateUserProfile([FromRoute] Guid id, [FromBody] UpdateUserProfileRequest request)
        {
            await _userService.UpdateProfileAsync(id, request.Username, request.Email);
            _logger.LogInformation($"User {id} profile updated.");

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
