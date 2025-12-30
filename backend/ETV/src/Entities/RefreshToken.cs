namespace ETV.src.Entities;

public class RefreshToken
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    // Relationship
    public Guid UserId { get; set; }
    public User? User { get; set; }
}
