using Microsoft.EntityFrameworkCore;
using ETV.src.Data;
using ETV.src.Exceptions;
using ETV.src.Utilities;

namespace ETV.src.Services
{
    public class UserService(AppDb context)
    {
        private readonly AppDb _context = context;

        /// <summary>
        /// Tạo user mới
        /// </summary>
        public async Task<User> CreateUserAsync(string username, string email, string password,
            string publicKey, string kdfSalt)
        {
            // Kiểm tra username đã tồn tại
            if (await IsUsernameExistsAsync(username))
            {
                throw new InvalidOperationException($"Username '{username}' already exists.");
            }

            // Kiểm tra email đã tồn tại
            if (await IsEmailExistsAsync(email))
            {
                throw new InvalidOperationException($"Email '{email}' already exists.");
            }

            // Hash password trước khi lưu
            var hashedPassword = PasswordHasher.HashPassword(password);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                Email = email,
                Password = hashedPassword,
                PublicKey = publicKey,
                KDFSalt = kdfSalt,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        /// <summary>
        /// Lấy user theo ID
        /// </summary>
        public async Task<User> GetUserAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId) ?? throw new NotFoundException("User", userId);
            return user;
        }

        /// <summary>
        /// Lấy user theo username
        /// </summary>
        public async Task<User> GetUserByUsernameAsync(string username)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username) ?? throw new NotFoundException("User", username);
            return user;
        }

        /// <summary>
        /// Lấy user theo email
        /// </summary>
        public async Task<User> GetUserByEmailAsync(string email)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email) ?? throw new NotFoundException("User", email);
            return user;
        }


        /// <summary>
        /// Cập nhật password của user (lưu hash)
        /// </summary>
        public async Task UpdatePasswordAsync(Guid userId, string hashedPassword)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId) ?? throw new NotFoundException("User", userId);
            if (string.IsNullOrWhiteSpace(hashedPassword))
            {
                throw new ArgumentException("Password cannot be empty.", nameof(hashedPassword));
            }

            user.Password = hashedPassword;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Kiểm tra username đã tồn tại chưa
        /// </summary>
        public async Task<bool> IsUsernameExistsAsync(string username)
        {
            return await _context.Users
                .AnyAsync(u => u.Username == username);
        }

        /// <summary>
        /// Kiểm tra email đã tồn tại chưa
        /// </summary>
        public async Task<bool> IsEmailExistsAsync(string email)
        {
            return await _context.Users
                .AnyAsync(u => u.Email == email);
        }

        /// <summary>
        /// Lấy thông tin user cơ bản (không gồm sensitive data)
        /// </summary>
        public async Task<(Guid Id, string Username, string Email, DateTimeOffset CreatedAt)> GetUserInfoAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return (user.Id, user.Username, user.Email, user.CreatedAt);
        }

        /// <summary>
        /// Lấy key materials của user (public key, encrypted private key, salt)
        /// Dùng cho client khôi phục key pair
        /// </summary>
        public async Task<(string PublicKey, string KDFSalt)> GetKeyMaterialsAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return (user.PublicKey, user.KDFSalt);
        }

        /// <summary>
        /// Cập nhật profile user
        /// </summary>
        public async Task UpdateProfileAsync(Guid userId, string username, string email)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            // Kiểm tra username mới có trùng với user khác không
            if (username != user.Username && await IsUsernameExistsAsync(username))
            {
                throw new InvalidOperationException($"Username '{username}' is already taken.");
            }

            // Kiểm tra email mới có trùng với user khác không
            if (email != user.Email && await IsEmailExistsAsync(email))
            {
                throw new InvalidOperationException($"Email '{email}' is already in use.");
            }

            user.Username = username;
            user.Email = email;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Xóa user (xóa tất cả data liên quan do cascade delete)
        /// </summary>
        public async Task DeleteUserAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy số lượng teams mà user tham gia
        /// </summary>
        public async Task<int> GetUserTeamCountAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return await _context.TeamMembers
                .CountAsync(tm => tm.UserId == userId);
        }

        /// <summary>
        /// Verify password against stored hash
        /// </summary>
        public async Task<bool> VerifyPasswordAsync(Guid userId, string password)
        {
            var user = await GetUserAsync(userId);
            return PasswordHasher.VerifyPassword(password, user.Password);
        }

        /// <summary>
        /// Verify password for username
        /// </summary>
        public async Task<bool> VerifyPasswordByUsernameAsync(string username, string password)
        {
            var user = await GetUserByUsernameAsync(username);
            return PasswordHasher.VerifyPassword(password, user.Password);
        }

        /// <summary>
        /// Cập nhật tất cả key materials (dùng khi đổi mật khẩu)
        /// </summary>
        public async Task UpdateAllKeyMaterialsAsync(Guid userId, string publicKey, string kdfSalt)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(kdfSalt))
            {
                throw new ArgumentException("All key materials must be provided.");
            }

            user.PublicKey = publicKey;
            user.KDFSalt = kdfSalt;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Cập nhật encrypted item keys cho personal items của user
        /// Dùng khi user đổi mật khẩu và cần re-encrypt personal item keys
        /// Kiểm tra tất cả items được cung cấp đều tồn tại và thuộc về user
        /// </summary>
        public async Task<bool> UpdateUserPersonalItemKeysAsync(Guid userId, List<(Guid ItemId, string EncryptedItemKey)> itemKeys)
        {
            var itemsToUpdate = itemKeys.Count;
            var itemsUpdated = 0;

            foreach (var (itemId, encryptedItemKey) in itemKeys)
            {
                // Kiểm tra personal item thuộc về user này (TeamId phải null)
                var personalItem = await _context.VaultItems
                    .FirstOrDefaultAsync(vi => vi.Id == itemId && vi.UserId == userId && vi.TeamId == null);

                if (personalItem != null)
                {
                    personalItem.EncryptedItemKey = encryptedItemKey;
                    personalItem.UpdatedAt = DateTimeOffset.UtcNow;
                    itemsUpdated++;
                }
            }

            // Nếu có items cần update, kiểm tra tất cả được tìm thấy
            if (itemsToUpdate > 0 && itemsUpdated != itemsToUpdate)
            {
                // Không update nếu không tìm thấy tất cả items
                return false;
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}