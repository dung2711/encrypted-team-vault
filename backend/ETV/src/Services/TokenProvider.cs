using System.Security.Claims;
using ETV.src.Data;
using ETV.src.Entities;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ETV.src.Services;

public sealed class TokenProvider(IConfiguration configuration)
{
    /// <summary>
    /// Create a signed JWT access token for the given user.
    /// </summary>
    public string Create(User user)
    {
        var secretKey = configuration["JWT:SECRET_KEY"] ?? throw new InvalidOperationException("JWT Key is not configured.");
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        // Create the token descriptor with user claims
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username)
            }),
            Expires = DateTime.UtcNow.AddMinutes(configuration.GetValue<int>("JWT:EXPIRATION_MINUTES")),
            SigningCredentials = credentials,
            Issuer = configuration["JWT:ISSUER"],
            Audience = configuration["JWT:AUDIENCE"]
        };
        return new JsonWebTokenHandler().CreateToken(tokenDescriptor);
    }

    /// <summary>
    /// Create and persist a refresh token for a user in the database.
    /// Returns the token string and its UTC expiry.
    /// </summary>
    public async Task<(string Token, DateTimeOffset ExpiresAtUtc)> CreateRefreshTokenAsync(AppDb db, Guid userId, int expiresInDays = 30)
    {
        // Use a cryptographically secure random number generator
        var bytes = new byte[64];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }

        // Encode as URL-safe base64
        var token = Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

        var expiresAt = DateTimeOffset.UtcNow.AddDays(expiresInDays);

        var rt = new RefreshToken
        {
            Token = token,
            UserId = userId,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt
        };

        db.RefreshTokens.Add(rt);
        await db.SaveChangesAsync();

        return (token, expiresAt);
    }

    /// <summary>
    /// Validate an access token's signature and optionally its lifetime, returning the principal.
    /// Use validateLifetime=false when extracting claims from an expired token during refresh flow.
    /// </summary>
    public async Task<ClaimsPrincipal?> GetPrincipalFromTokenAsync(string token, bool validateLifetime = false)
    {
        var secretKey = configuration["JWT:SECRET_KEY"] ?? throw new InvalidOperationException("JWT Key is not configured.");
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey));

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = true,
            ValidIssuer = configuration["JWT:ISSUER"],
            ValidateAudience = true,
            ValidAudience = configuration["JWT:AUDIENCE"],
            ValidateLifetime = validateLifetime
        };

        var handler = new JsonWebTokenHandler();
        try
        {
            var result = await handler.ValidateTokenAsync(token, tokenValidationParameters);
            if (!result.IsValid) return null;
            return result.ClaimsIdentity != null ? new ClaimsPrincipal(result.ClaimsIdentity) : null;
        }
        catch
        {
            return null;
        }
    }
}