using Microsoft.EntityFrameworkCore;
using ETV.src.Data;
using ETV.src.Exceptions;

namespace ETV.src.Services
{
    public class ItemService
    {
        private readonly AppDb _context;

        public ItemService(AppDb context)
        {
            _context = context;
        }

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

            _context.VaultItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// Lấy item theo ID
        /// </summary>
        public async Task<VaultItem> GetItemAsync(Guid itemId)
        {
            var item = await _context.VaultItems
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
            return await _context.VaultItems
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
            return await _context.VaultItems
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
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            item.EncryptedBlob = encryptedBlob;
            item.EncryptedItemKey = encryptedItemKey;
            item.KeyVersion = keyVersion;
            item.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Cập nhật item key (dùng cho key rotation)
        /// Client giải mã item key cũ bằng team key cũ
        /// Rồi mã hóa lại bằng team key mới
        /// </summary>
        public async Task UpdateItemKeyAsync(Guid itemId, string encryptedItemKey, int newKeyVersion)
        {
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            item.EncryptedItemKey = encryptedItemKey;
            item.KeyVersion = newKeyVersion;
            item.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Cập nhật item key cho nhiều items cùng lúc (batch update)
        /// Dùng trong quá trình key rotation
        /// </summary>
        public async Task UpdateItemKeysAsync(List<(Guid itemId, string encryptedItemKey, int keyVersion)> updates)
        {
            foreach (var update in updates)
            {
                var item = await _context.VaultItems
                    .FirstOrDefaultAsync(v => v.Id == update.itemId);

                if (item != null)
                {
                    item.EncryptedItemKey = update.encryptedItemKey;
                    item.KeyVersion = update.keyVersion;
                    item.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Xóa item
        /// </summary>
        public async Task DeleteItemAsync(Guid itemId)
        {
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            _context.VaultItems.Remove(item);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Xóa tất cả items trong team
        /// Dùng khi xóa team
        /// (? on delete team -> cascade ?)
        /// </summary>
        public async Task DeleteTeamItemsAsync(Guid teamId)
        {
            var items = await _context.VaultItems
                .Where(v => v.TeamId == teamId)
                .ToListAsync();

            _context.VaultItems.RemoveRange(items);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy key version hiện tại của item
        /// Client kiểm tra item_key_version có trùng với team_key_version không
        /// </summary>
        public async Task<int> GetItemKeyVersionAsync(Guid itemId)
        {
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            return item.KeyVersion;
        }

        /// <summary>
        /// Kiểm tra item có thuộc team không
        /// </summary>
        public async Task<bool> IsItemInTeamAsync(Guid itemId, Guid teamId)
        {
            return await _context.VaultItems
                .AnyAsync(v => v.Id == itemId && v.TeamId == teamId);
        }

        /// <summary>
        /// Lấy tất cả items có key version cụ thể trong team
        /// Dùng cho key rotation - để biết items nào cần update
        /// </summary>
        public async Task<List<VaultItem>> GetTeamItemsByKeyVersionAsync(Guid teamId, int keyVersion)
        {
            return await _context.VaultItems
                .Where(v => v.TeamId == teamId && v.KeyVersion == keyVersion)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy tất cả items cần update (items không ở key version mới nhất)
        /// Dùng khi rotate key - tìm items cũ để update
        /// </summary>
        public async Task<List<VaultItem>> GetTeamItemsNeedingKeyRotationAsync(Guid teamId, int currentKeyVersion)
        {
            return await _context.VaultItems
                .Where(v => v.TeamId == teamId && v.KeyVersion < currentKeyVersion)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy tất cả items cần update kèm theo version cũ
        /// Dùng để client biết items nào đã cũ so với key version hiện tại
        /// </summary>
        public async Task<List<VaultItem>> GetTeamOutdatedItemsAsync(Guid teamId, int currentKeyVersion)
        {
            return await _context.VaultItems
                .Where(v => v.TeamId == teamId && v.KeyVersion < currentKeyVersion)
                .OrderBy(v => v.KeyVersion)
                .ThenBy(v => v.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Thống kê items trong team
        /// </summary>
        public async Task<int> GetTeamItemCountAsync(Guid teamId)
        {
            return await _context.VaultItems
                .CountAsync(v => v.TeamId == teamId);
        }

        /// <summary>
        /// Kiểm tra item key version có khớp với team key version không
        /// Điều kiện: item_key_version == team_key_version (mới nhất)
        /// </summary>
        public async Task<bool> IsItemKeyVersionCurrentAsync(Guid itemId, int currentTeamKeyVersion)
        {
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            return item.KeyVersion == currentTeamKeyVersion;
        }

        /// <summary>
        /// Lấy encrypted item key và version
        /// Dùng khi client muốn giải mã item
        /// </summary>
        public async Task<(string encryptedItemKey, int keyVersion)> GetItemKeyDetailsAsync(Guid itemId)
        {
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            return (item.EncryptedItemKey, item.KeyVersion);
        }

        /// <summary>
        /// Lấy chi tiết item cho client
        /// Bao gồm encrypted blob, encrypted item key, và version
        /// </summary>
        public async Task<dynamic> GetItemDetailsAsync(Guid itemId)
        {
            var item = await _context.VaultItems
                .FirstOrDefaultAsync(v => v.Id == itemId);

            if (item == null)
            {
                throw new NotFoundException("Item", itemId);
            }

            return new
            {
                id = item.Id,
                teamId = item.TeamId,
                encryptedBlob = item.EncryptedBlob,
                encryptedItemKey = item.EncryptedItemKey,
                keyVersion = item.KeyVersion,
                createdAt = item.CreatedAt,
                updatedAt = item.UpdatedAt
            };
        }
    }
}