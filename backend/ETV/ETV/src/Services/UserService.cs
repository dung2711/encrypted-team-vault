using Microsoft.EntityFrameworkCore;
using ETV.src.Data;
using ETV.src.Exceptions;

namespace ETV.src.Services
{
    public class UserService
    {
        private readonly AppDb _context;

        /// <function_calls>
        public UserService(AppDb context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo user mới
        /// </summary>
        public async Task<User> CreateUserAsync(string username, string email, string password,
            string publicKey, string encryptedPrivateKey, string kdfSalt)
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

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                Email = email,
                Password = password,
                PublicKey = publicKey,
                EncryptedPrivateKey = encryptedPrivateKey,
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
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return user;
        }

        /// <summary>
        /// Lấy user theo username
        /// </summary>
        public async Task<User> GetUserByUsernameAsync(string username)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
            {
                throw new NotFoundException("User", username);
            }

            return user;
        }

        /// <summary>
        /// Lấy user theo email
        /// </summary>
        public async Task<User> GetUserByEmailAsync(string email)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                throw new NotFoundException("User", email);
            }

            return user;
        }

        /// <summary>
        /// Cập nhật public key của user
        /// </summary>
        public async Task UpdatePublicKeyAsync(Guid userId, string newPublicKey)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            if (string.IsNullOrWhiteSpace(newPublicKey))
            {
                throw new ArgumentException("Public key cannot be empty.", nameof(newPublicKey));
            }

            user.PublicKey = newPublicKey;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy public key của user
        /// </summary>
        public async Task<string> GetPublicKeyAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return user.PublicKey;
        }

        /// <summary>
        /// Cập nhật encrypted private key của user
        /// </summary>
        public async Task UpdateEncryptedPrivateKeyAsync(Guid userId, string newEncryptedPrivateKey)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            if (string.IsNullOrWhiteSpace(newEncryptedPrivateKey))
            {
                throw new ArgumentException("Encrypted private key cannot be empty.", nameof(newEncryptedPrivateKey));
            }

            user.EncryptedPrivateKey = newEncryptedPrivateKey;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy encrypted private key của user
        /// </summary>
        public async Task<string> GetEncryptedPrivateKeyAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return user.EncryptedPrivateKey;
        }

        /// <summary>
        /// Lấy KDF salt của user
        /// Dùng để derived key từ password
        /// </summary>
        public async Task<string> GetKdfSaltAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return user.KDFSalt;
        }

        /// <summary>
        /// Cập nhật password của user (lưu hash)
        /// </summary>
        public async Task UpdatePasswordAsync(Guid userId, string hashedPassword)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            if (string.IsNullOrWhiteSpace(hashedPassword))
            {
                throw new ArgumentException("Password cannot be empty.", nameof(hashedPassword));
            }

            user.Password = hashedPassword;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy password hash của user
        /// Dùng để verify password khi login
        /// </summary>
        public async Task<string> GetPasswordHashAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return user.Password;
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
        public async Task<(string PublicKey, string EncryptedPrivateKey, string KDFSalt)> GetKeyMaterialsAsync(Guid userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new NotFoundException("User", userId);
            }

            return (user.PublicKey, user.EncryptedPrivateKey, user.KDFSalt);
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
    }
}