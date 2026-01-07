using System.Security.Claims;
using ETV.HttpModel.Request;
using ETV.HttpModel.Response;
using ETV.Services;
using ETV.src.Filters;
using ETV.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ETV.Controllers
{
    /// <summary>
    /// Team management endpoints
    /// </summary>
    /// <remarks>
    /// Provides functionality for creating teams, managing members, and handling encrypted team keys.
    /// All endpoints require JWT authentication and verify team membership before granting access.
    /// </remarks>
    [ApiController]
    [Route("api/teams")]
    [Authorize]
    public class TeamController(TeamService teamService, ItemService itemService, ILogger<TeamController> logger)
        : ControllerBase
    {
        private readonly ItemService _itemService = itemService;

        /// <summary>Create a new team</summary>
        /// <remarks>
        /// Creates a new team with the requesting user as admin.
        /// Team key is encrypted with creator's public key.
        /// </remarks>
        /// <param name="request">Team name and encrypted team key</param>
        /// <returns>Created team with ID and metadata</returns>
        /// <response code="201">Team created successfully</response>
        /// <response code="400">Invalid request data</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        [HttpPost]
        [ProducesResponseType(typeof(CreateTeamResponse), StatusCodes.Status201Created)]
        public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var team = await teamService.CreateTeamAsync(
                request.TeamName,
                userId,
                request.EncryptedTeamKeyForCreator
            );

            logger.LogInformation($"Team {team.TeamId} created by user {userId}.");

            return Created(new Uri($"{Request.Scheme}://{Request.Host}/api/teams/{team.TeamId}"), new
            {
                id = team.TeamId,
                name = team.TeamName,
                createdAt = team.CreatedAt
            });
        }

        /// <summary>List user's teams</summary>
        /// <remarks>
        /// Returns all teams where the user is a member.
        /// </remarks>
        /// <returns>List of teams with count</returns>
        /// <response code="200">Teams retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        [HttpGet]
        [ProducesResponseType(typeof(GetTeamsListResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetJoinedTeams()
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var teams = await teamService.GetJoinedTeamsAsync(userId);

            return Ok(new
            {
                count = teams.Count,
                teams = teams.Select(t => new
                {
                    id = t.TeamId,
                    name = t.TeamName,
                    createdAt = t.CreatedAt
                })
            });
        }

        /// <summary>Get team details</summary>
        /// <remarks>
        /// Returns team information. User must be team member.
        /// </remarks>
        /// <param name="teamId">Team ID</param>
        /// <returns>Team details</returns>
        /// <response code="200">Team retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="403">Forbidden - user is not team member</response>
        /// <response code="404">Team not found</response>
        [HttpGet("{teamId}")]
        [ValidateEntityExists<Team>("teamId")]
        [ProducesResponseType(typeof(GetTeamResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTeamDetails([FromRoute] Guid teamId)
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Kiểm tra user có phải member của team không
            if (!await teamService.IsTeamMemberAsync(teamId, userId))
            {
                return Forbid();
            }

            var team = await teamService.GetTeamDetailsAsync(teamId);

            return Ok(new
            {
                id = team.TeamId,
                name = team.TeamName,
                createdAt = team.CreatedAt
            });
        }

        /// <summary>List team members</summary>
        /// <remarks>
        /// Returns all members in the team with their roles and key versions.
        /// User must be team member.
        /// </remarks>
        /// <param name="teamId">Team ID</param>
        /// <returns>List of team members with count</returns>
        /// <response code="200">Members retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="403">Forbidden - user is not team member</response>
        /// <response code="404">Team not found</response>
        [HttpGet("{teamId}/members")]
        [ValidateEntityExists<Team>("teamId")]
        [ProducesResponseType(typeof(GetTeamMembersResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTeamMembers([FromRoute] Guid teamId)
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Kiểm tra user có phải member của team không
            if (!await teamService.IsTeamMemberAsync(teamId, userId))
            {
                return Forbid();
            }

            var members = await teamService.GetTeamMembersAsync(teamId);

            return Ok(new
            {
                count = members.Count,
                members = members.Select(m => new
                {
                    userId = m.UserId,
                    username = m.User?.Username,
                    role = m.Role.ToString(),
                    keyVersion = m.KeyVersion,
                    joinedAt = m.JoinedAt
                })
            });
        }

        /// <summary>Add member to team</summary>
        /// <remarks>
        /// Adds a new member to the team with encrypted team key.
        /// Only team admin can add members.
        /// </remarks>
        /// <param name="teamId">Team ID</param>
        /// <param name="memberId">User ID to add as member</param>
        /// <param name="request">Encrypted team key for the member</param>
        /// <returns>Success message</returns>
        /// <response code="201">Member added successfully</response>
        /// <response code="400">Invalid request data or user already member</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="403">Forbidden - user is not team admin</response>
        /// <response code="404">Team or user not found</response>
        [HttpPost("{teamId}/members/{memberId}")]
        [ValidateEntityExists<Team>("teamId")]
        [ValidateEntityExists<User>("memberId")]
        [ProducesResponseType(typeof(SuccessMessageResponse), StatusCodes.Status201Created)]
        public async Task<IActionResult> AddMember([FromRoute] Guid teamId, [FromRoute] Guid memberId, [FromBody] AddMemberRequest request)
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Kiểm tra user có phải admin của team không
            if (!await teamService.IsTeamAdminAsync(teamId, userId))
            {
                return Forbid();
            }

            // Lấy current key version
            var currentKeyVersion = await teamService.GetCurrentKeyVersionAsync(teamId);

            await teamService.AddMemberToTeamAsync(
                teamId,
                memberId,
                Role.Member,
                request.EncryptedTeamKey,
                currentKeyVersion
            );

            logger.LogInformation($"User {memberId} added to team {teamId} by {userId}.");

            return Created(
                new Uri($"{Request.Scheme}://{Request.Host}/api/teams/{teamId}/members/{memberId}"),
                new { message = "Member added successfully." }
            );
        }

        /// <summary>Remove member from team</summary>
        /// <remarks>
        /// Removes a member from the team.
        /// Only team admin can remove members.
        /// </remarks>
        /// <param name="teamId">Team ID</param>
        /// <param name="userId">User ID to remove</param>
        /// <returns>Success message</returns>
        /// <response code="200">Member removed successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="403">Forbidden - user is not team admin</response>
        /// <response code="404">Team or member not found, or member does not belong to team</response>
        [HttpDelete("{teamId}/members/{userId}")]
        [ValidateEntityExists<Team>("teamId")]
        [ValidateEntityExists<User>("userId")]
        [ValidateEntityRelation<Team, TeamMember>("teamId", "userId")]
        [ProducesResponseType(typeof(SuccessMessageResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> RemoveMember([FromRoute] Guid teamId, [FromRoute] Guid userId)
        {
            // TODO: Lấy userId từ JWT token
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Kiểm tra user có phải admin của team không
            if (!await teamService.IsTeamAdminAsync(teamId, currentUserId))
            {
                return Forbid();
            }

            await teamService.RemoveMemberFromTeamAsync(teamId, userId);

            logger.LogInformation($"User {userId} removed from team {teamId} by {currentUserId}.");

            return Ok(new { message = "Member removed successfully." });
        }

        /// <summary>Update team keys for members</summary>
        /// <remarks>
        /// Updates encrypted team keys after key rotation.
        /// Sends new encrypted keys to multiple members.
        /// Only team admin can update team keys.
        /// </remarks>
        /// <param name="teamId">Team ID</param>
        /// <param name="request">List of encrypted team keys for members with new key version</param>
        /// <returns>Success message</returns>
        /// <response code="200">Team keys updated successfully</response>
        /// <response code="400">Invalid request data</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="403">Forbidden - user is not team admin</response>
        /// <response code="404">Team not found</response>
        [HttpPut("{teamId}/keys")]
        [ValidateEntityExists<Team>("teamId")]
        [ProducesResponseType(typeof(SuccessMessageResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> UpdateTeamKeys([FromRoute] Guid teamId, [FromBody] UpdateTeamKeysRequest request)
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Kiểm tra user có phải admin của team không
            if (!await teamService.IsTeamAdminAsync(teamId, userId))
            {
                return Forbid();
            }

            // TODO: Implement logic để cập nhật encrypted team keys cho multiple members
            // Cơ bản là update TeamMember.EncryptedTeamKey và KeyVersion

            logger.LogInformation($"Team keys updated for team {teamId} by {userId}.");

            return Ok(new { message = "Team keys updated successfully." });
        }

        /// <summary>Get encrypted team key for user</summary>
        /// <remarks>
        /// Returns the encrypted team key specific to the requesting user.
        /// User must be team member.
        /// </remarks>
        /// <param name="teamId">Team ID</param>
        /// <returns>Encrypted team key and key version</returns>
        /// <response code="200">Team key retrieved successfully</response>
        /// <response code="401">Unauthorized - requires valid JWT token</response>
        /// <response code="403">Forbidden - user is not team member</response>
        /// <response code="404">Team not found or user is not team member</response>
        [HttpGet("{teamId}/keys")]
        [ValidateEntityExists<Team>("teamId")]
        [ProducesResponseType(typeof(GetTeamKeyResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTeamKey([FromRoute] Guid teamId)
        {
            // TODO: Lấy userId từ JWT token
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Kiểm tra user có phải member của team không
            if (!await teamService.IsTeamMemberAsync(teamId, userId))
            {
                return Forbid();
            }

            // TODO: Lấy team member để lấy encrypted team key
            var members = await teamService.GetTeamMembersAsync(teamId);
            var userMember = members.FirstOrDefault(m => m.UserId == userId);

            if (userMember == null)
            {
                return NotFound(new { message = "User is not a member of this team." });
            }

            return Ok(new
            {
                teamId = teamId,
                encryptedTeamKey = userMember.EncryptedTeamKey,
                keyVersion = userMember.KeyVersion
            });
        }
    }
}
