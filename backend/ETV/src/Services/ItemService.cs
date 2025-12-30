using ETV.src.Data;
using ETV.src.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace ETV.Services;

public class ItemService(AppDb context)
{
    /// <summary>
    /// Tạo item mới
    /// Client gửi: encrypted blob, encrypted item key, item_key_version
    /// </summary>
    public async Task<VaultItem> CreateItemAsync(Guid teamId, string encryptedBlob,
        string encryptedItemKey, int keyVersion)
    {
        var item = new VaultItem
        {
            Id = Guid.NewGuid(),
            TeamId = teamId,
            EncryptedBlob = encryptedBlob,
            EncryptedItemKey = encryptedItemKey,
            KeyVersion = keyVersion,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        context.VaultItems.Add(item);
        await context.SaveChangesAsync();
        return item;
    }

    /// <summary>
    /// Lấy item theo ID
    /// </summary>
    public async Task<VaultItem> GetItemAsync(Guid itemId)
    {
        var item = await context.VaultItems
            .FirstOrDefaultAsync(v => v.Id == itemId);

        if (item == null)
        {
            throw new NotFoundException("Item", itemId);
        }

        return item;
    }

    /// <summary>
    /// Lấy tất cả items trong team
    /// Client sử dụng để hiển thị danh sách vault items
    /// </summary>
    public async Task<List<VaultItem>> GetTeamItemsAsync(Guid teamId)
    {
        return await context.VaultItems
            .Where(v => v.TeamId == teamId)
            .OrderByDescending(v => v.UpdatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy items trong team cùng với team info
    /// Dùng để validate quyền truy cập
    /// </summary>
    public async Task<List<VaultItem>> GetTeamItemsWithDetailsAsync(Guid teamId)
    {
        return await context.VaultItems
            .Where(v => v.TeamId == teamId)
            .Include(v => v.Team)
            .OrderByDescending(v => v.UpdatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Cập nhật item (blob và item key)
    /// Client gửi: encrypted blob mới, encrypted item key mới, version mới
    /// Dùng khi user chỉnh sửa secret
    /// </summary>
    public async Task UpdateItemAsync(Guid itemId, string encryptedBlob,
        string encryptedItemKey, int keyVersion)
    {
        var item = await context.VaultItems
            .FirstOrDefaultAsync(v => v.Id == itemId);

        if (item == null)
        {
            throw new NotFoundException("Item", itemId);
        }

        item.EncryptedBlob = encryptedBlob;
        item.EncryptedItemKey = encryptedItemKey;
        item.KeyVersion = keyVersion;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Xóa item
    /// </summary>
    public async Task DeleteItemAsync(Guid itemId)
    {
        var item = await context.VaultItems
            .FirstOrDefaultAsync(v => v.Id == itemId);

        if (item == null)
        {
            throw new NotFoundException("Item", itemId);
        }

        context.VaultItems.Remove(item);
        await context.SaveChangesAsync();
    }
}
