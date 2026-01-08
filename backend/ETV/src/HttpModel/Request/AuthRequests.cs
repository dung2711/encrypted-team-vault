namespace ETV.HttpModel.Request;

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}

public class RefreshTokenRequest
{
    public required string RefreshToken { get; set; }
}

public class LogoutRequest
{
    public string? RefreshToken { get; set; }
}

public class ChangePasswordRequest
{
    public required string OldPassword { get; set; }
    public required string NewPassword { get; set; }
    /// <summary>New public key (derived from new password on client)</summary>
    public required string PublicKey { get; set; }
    /// <summary>New KDF salt (regenerated on client)</summary>
    public required string KDFSalt { get; set; }
    /// <summary>List of re-encrypted team keys for all teams the user is a member of</summary>
    public required List<ReEncryptedTeamKey> ReEncryptedTeamKeys { get; set; }
}

public class ReEncryptedTeamKey
{
    public Guid TeamId { get; set; }
    public required string EncryptedTeamKey { get; set; }
    public int KeyVersion { get; set; }
}
