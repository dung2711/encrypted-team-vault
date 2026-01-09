public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string PublicKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string KDFSalt { get; set; }
    public List<TeamMember> TeamMembers { get; set; }
    public List<VaultItem> VaultItems { get; set; } = new();
}