namespace ETV.HttpModel.Request;

public class RegisterRequest
{
    public required string Username { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string PublicKey { get; set; }
    public required string KDFSalt { get; set; }
}

public class UpdateKeyMaterialsRequest
{
    public required string PublicKey { get; set; }
    public required string KDFSalt { get; set; }
}
