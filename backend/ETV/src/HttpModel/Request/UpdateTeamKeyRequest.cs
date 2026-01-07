public class UpdateTeamKeyRequest
{
    public Guid TeamId { get; set; }
    public string EncryptedTeamKey { get; set; }
    public int KeyVersion { get; set; }
}