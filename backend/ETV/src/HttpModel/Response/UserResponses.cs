namespace ETV.HttpModel.Response;

public class RegisterResponse
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GetKeyMaterialsResponse
{
    public required string PublicKey { get; set; }
    public required string KDFSalt { get; set; }
}

public class GetUserResponse
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public DateTime CreatedAt { get; set; }
}
