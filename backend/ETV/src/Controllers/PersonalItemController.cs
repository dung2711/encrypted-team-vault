using System.Security.Claims;
using ETV.HttpModel.Request;
using ETV.HttpModel.Response;
using ETV.Services;
using ETV.src.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ETV.Controllers;

/// <summary>
/// User personal vault items management
/// </summary>
/// <remarks>
/// Provides functionality for managing personal vault items that belong to individual users.
/// All endpoints require JWT authentication.
/// </remarks>
[ApiController]
[Route("api/user/items")]
[Authorize]
public class PersonalItemController(ItemService itemService, ILogger<PersonalItemController> logger)
    : ControllerBase
{
    /// <summary>Create a new personal vault item</summary>
    /// <remarks>
    /// Creates encrypted personal vault item with encrypted blob and item key.
    /// Item belongs to the authenticated user only.
    /// </remarks>
    /// <param name="request">Item data with encrypted blob and key</param>
    /// <returns>Created item with ID and metadata</returns>
    /// <response code="201">Item created successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    [HttpPost]
    [ProducesResponseType(typeof(CreateItemResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreatePersonalItem([FromBody] CreateItemRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        var item = await itemService.CreatePersonalItemAsync(
            userId,
            request.EncryptedBlob,
            request.EncryptedItemKey,
            request.KeyVersion
        );

        logger.LogInformation($"Personal item {item.Id} created by user {userId}.");

        return Created(new Uri($"{Request.Scheme}://{Request.Host}/api/user/items/{item.Id}"), new
        {
            id = item.Id,
            userId = item.UserId,
            createdAt = item.CreatedAt,
            updatedAt = item.UpdatedAt,
            keyVersion = item.KeyVersion
        });
    }

    /// <summary>Get personal vault item by ID</summary>
    /// <remarks>
    /// Returns encrypted personal vault item data.
    /// User can only access their own items.
    /// </remarks>
    /// <param name="itemId">Item ID</param>
    /// <returns>Vault item with encrypted blob and key</returns>
    /// <response code="200">Item retrieved successfully</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="404">Item not found or does not belong to user</response>
    [HttpGet("{itemId}")]
    [ValidateEntityExists<VaultItem>("itemId")]
    [ProducesResponseType(typeof(GetItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersonalItem([FromRoute] Guid itemId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        var item = await itemService.GetPersonalItemAsync(itemId, userId);

        return Ok(new
        {
            id = item.Id,
            userId = item.UserId,
            encryptedBlob = item.EncryptedBlob,
            encryptedItemKey = item.EncryptedItemKey,
            keyVersion = item.KeyVersion,
            createdAt = item.CreatedAt,
            updatedAt = item.UpdatedAt
        });
    }

    /// <summary>List all personal vault items</summary>
    /// <remarks>
    /// Returns all encrypted personal vault items for the authenticated user.
    /// </remarks>
    /// <returns>List of vault items with count</returns>
    /// <response code="200">Items retrieved successfully</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    [HttpGet]
    [ProducesResponseType(typeof(GetItemsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersonalItems()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        var items = await itemService.GetPersonalItemsAsync(userId);

        return Ok(new
        {
            count = items.Count,
            items = items.Select(i => new
            {
                id = i.Id,
                userId = i.UserId,
                encryptedBlob = i.EncryptedBlob,
                encryptedItemKey = i.EncryptedItemKey,
                keyVersion = i.KeyVersion,
                createdAt = i.CreatedAt,
                updatedAt = i.UpdatedAt
            })
        });
    }

    /// <summary>Update personal vault item</summary>
    /// <remarks>
    /// Updates encrypted vault item with new blob and key.
    /// User can only update their own items.
    /// </remarks>
    /// <param name="itemId">Item ID</param>
    /// <param name="request">Updated item data</param>
    /// <returns>Success message</returns>
    /// <response code="200">Item updated successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="404">Item not found or does not belong to user</response>
    [HttpPut("{itemId}")]
    [ValidateEntityExists<VaultItem>("itemId")]
    [ProducesResponseType(typeof(SuccessMessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersonalItem([FromRoute] Guid itemId, [FromBody] UpdateItemRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        await itemService.UpdatePersonalItemAsync(
            itemId,
            userId,
            request.EncryptedBlob,
            request.EncryptedItemKey,
            request.KeyVersion
        );

        logger.LogInformation($"Personal item {itemId} updated by user {userId}.");

        return Ok(new { message = "Item updated successfully." });
    }

    /// <summary>Delete personal vault item</summary>
    /// <remarks>
    /// Deletes the vault item.
    /// User can only delete their own items.
    /// </remarks>
    /// <param name="itemId">Item ID</param>
    /// <returns>Success message</returns>
    /// <response code="200">Item deleted successfully</response>
    /// <response code="401">Unauthorized - requires valid JWT token</response>
    /// <response code="404">Item not found or does not belong to user</response>
    [HttpDelete("{itemId}")]
    [ValidateEntityExists<VaultItem>("itemId")]
    [ProducesResponseType(typeof(SuccessMessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeletePersonalItem([FromRoute] Guid itemId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        await itemService.DeletePersonalItemAsync(itemId, userId);

        logger.LogInformation($"Personal item {itemId} deleted by user {userId}.");

        return Ok(new { message = "Item deleted successfully." });
    }
}
