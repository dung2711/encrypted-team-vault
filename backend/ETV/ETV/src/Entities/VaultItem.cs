public class VaultItem
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Team Team { get; set; }
    public string EncryptedBlob { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string EncryptedItemKey { get; set; }
    public int KeyVersion { get; set; }

}