public class VaultItem
{
    public Guid Id { get; set; }

    // Nullable - either TeamId or UserId must be set, but not both
    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }

    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public required string EncryptedBlob { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public required string EncryptedItemKey { get; set; }
    public int KeyVersion { get; set; }
}