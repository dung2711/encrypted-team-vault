namespace ETV.HttpModel.Response;

public class LoginResponse
{
    public Guid UserId { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
    public long ExpiresIn { get; set; }
    public required string PublicKey { get; set; }
    public required string KDFSalt { get; set; }
}

public class RefreshTokenResponse
{
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
    public long ExpiresIn { get; set; }
}

public class ChangePasswordResponse
{
    public required string Message { get; set; }
}
