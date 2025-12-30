using System.Security.Claims;
using ETV.HttpModel;
using ETV.HttpModel.Request;
using ETV.HttpModel.Response;
using ETV.Services;
using ETV.src.Filters;
using ETV.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ETV.Controllers;

/// <summary>
/// Vault item management for teams
/// </summary>
[ApiController]
[Route("api/teams/{teamId}/items")]
[Authorize]
public class ItemController(ItemService itemService, TeamService teamService, ILogger<ItemController> logger)
    : ControllerBase
{
    /// <summary>Create a new vault item in team</summary>
    /// <remarks>
    /// Creates encrypted vault item with encrypted blob and item key.
    /// User must be team member to create items.
    /// </remarks>
    /// <param name="teamId">Team ID</param>
    /// <param name="request">Item data with encrypted blob and key</param>
    /// <returns>Created item with ID and metadata</returns>
    /// <response code="201">Item created successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="403">Forbidden - user is not team member</response>
    /// <response code="404">Team not found</response>
    [HttpPost]
    [ValidateEntityExists<Team>("teamId")]
    [ProducesResponseType(typeof(CreateItemResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateItem([FromRoute] Guid teamId, [FromBody] CreateItemRequest request)
    {
        // TODO: Lấy userId từ JWT token
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        // Kiểm tra user có phải member của team không
        if (!await teamService.IsTeamMemberAsync(teamId, userId))
        {
            return Forbid();
        }

        var item = await itemService.CreateItemAsync(
            teamId,
            request.EncryptedBlob,
            request.EncryptedItemKey,
            request.KeyVersion
        );

        logger.LogInformation($"Item {item.Id} created in team {teamId} by user {userId}.");

        return Created(new Uri($"{Request.Scheme}://{Request.Host}/api/teams/{teamId}/items/{item.Id}"), new
        {
            id = item.Id,
            teamId = item.TeamId,
            createdAt = item.CreatedAt,
            updatedAt = item.UpdatedAt,
            keyVersion = item.KeyVersion
        });
    }

    /// <summary>Get vault item by ID</summary>
    /// <remarks>
    /// Returns encrypted vault item data. User must be team member.
    /// </remarks>
    /// <param name="teamId">Team ID</param>
    /// <param name="itemId">Item ID</param>
    /// <returns>Vault item with encrypted blob and key</returns>
    /// <response code="200">Item retrieved successfully</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="403">Forbidden - user is not team member</response>
    /// <response code="404">Team or item not found</response>
    [HttpGet("{itemId}")]
    [ValidateEntityExists<Team>("teamId")]
    [ValidateEntityExists<VaultItem>("itemId")]
    [ProducesResponseType(typeof(GetItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItem([FromRoute] Guid teamId, [FromRoute] Guid itemId)
    {
        // TODO: Lấy userId từ JWT token
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        // Kiểm tra user có phải member của team không
        if (!await teamService.IsTeamMemberAsync(teamId, userId))
        {
            return Forbid();
        }

        var item = await itemService.GetItemAsync(itemId);

        // Kiểm tra item có thuộc team này không
        if (item.TeamId != teamId)
        {
            return NotFound(new { message = "Item not found in this team." });
        }

        return Ok(new
        {
            id = item.Id,
            teamId = item.TeamId,
            encryptedBlob = item.EncryptedBlob,
            encryptedItemKey = item.EncryptedItemKey,
            keyVersion = item.KeyVersion,
            createdAt = item.CreatedAt,
            updatedAt = item.UpdatedAt
        });
    }

    /// <summary>List all vault items in team</summary>
    /// <remarks>
    /// Returns all encrypted vault items for the team.
    /// User must be team member.
    /// </remarks>
    /// <param name="teamId">Team ID</param>
    /// <returns>List of vault items with count</returns>
    /// <response code="200">Items retrieved successfully</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="403">Forbidden - user is not team member</response>
    /// <response code="404">Team not found</response>
    [HttpGet]
    [ValidateEntityExists<Team>("teamId")]
    [ProducesResponseType(typeof(GetTeamItemsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTeamItems([FromRoute] Guid teamId)
    {
        // TODO: Lấy userId từ JWT token
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        // Kiểm tra user có phải member của team không
        if (!await teamService.IsTeamMemberAsync(teamId, userId))
        {
            return Forbid();
        }

        var items = await itemService.GetTeamItemsAsync(teamId);

        return Ok(new
        {
            count = items.Count,
            items = items.Select(item => new
            {
                id = item.Id,
                teamId = item.TeamId,
                encryptedBlob = item.EncryptedBlob,
                encryptedItemKey = item.EncryptedItemKey,
                keyVersion = item.KeyVersion,
                createdAt = item.CreatedAt,
                updatedAt = item.UpdatedAt
            })
        });
    }

    /// <summary>Update vault item</summary>
    /// <remarks>
    /// Updates encrypted blob and item key. User must be team member.
    /// </remarks>
    /// <param name="teamId">Team ID</param>
    /// <param name="itemId">Item ID</param>
    /// <param name="request">Updated item data with new encrypted blob and key</param>
    /// <returns>Success message</returns>
    /// <response code="200">Item updated successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="403">Forbidden - user is not team member</response>
    /// <response code="404">Team or item not found</response>
    [HttpPut("{itemId}")]
    [ValidateEntityExists<Team>("teamId")]
    [ValidateEntityExists<VaultItem>("itemId")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateItem([FromRoute] Guid teamId, [FromRoute] Guid itemId, [FromBody] UpdateItemRequest request)
    {
        // TODO: Lấy userId từ JWT token
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        // Kiểm tra user có phải member của team không
        if (!await teamService.IsTeamMemberAsync(teamId, userId))
        {
            return Forbid();
        }

        var item = await itemService.GetItemAsync(itemId);

        // Kiểm tra item có thuộc team này không
        if (item.TeamId != teamId)
        {
            return NotFound(new { message = "Item not found in this team." });
        }

        await itemService.UpdateItemAsync(
            itemId,
            request.EncryptedBlob,
            request.EncryptedItemKey,
            request.KeyVersion
        );

        logger.LogInformation($"Item {itemId} updated in team {teamId} by user {userId}.");

        return Ok(new { message = "Item updated successfully." });
    }


    /// <summary>Delete vault item</summary>
    /// <remarks>
    /// Permanently deletes vault item. User must be team member.
    /// </remarks>
    /// <param name="teamId">Team ID</param>
    /// <param name="itemId">Item ID</param>
    /// <returns>Success message</returns>
    /// <response code="200">Item deleted successfully</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="403">Forbidden - user is not team member</response>
    /// <response code="404">Team or item not found</response>
    [HttpDelete("{itemId}")]
    [ValidateEntityExists<Team>("teamId")]
    [ValidateEntityExists<VaultItem>("itemId")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteItem([FromRoute] Guid teamId, [FromRoute] Guid itemId)
    {
        // TODO: Lấy userId từ JWT token
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        // Kiểm tra user có phải member của team không
        if (!await teamService.IsTeamMemberAsync(teamId, userId))
        {
            return Forbid();
        }

        var item = await itemService.GetItemAsync(itemId);

        // Kiểm tra item có thuộc team này không
        if (item.TeamId != teamId)
        {
            return NotFound(new { message = "Item not found in this team." });
        }

        await itemService.DeleteItemAsync(itemId);

        logger.LogInformation($"Item {itemId} deleted from team {teamId} by user {userId}.");

        return Ok(new { message = "Item deleted successfully." });
    }
}