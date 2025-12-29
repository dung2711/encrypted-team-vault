public class TeamMember
{
    public Guid TeamId { get; set; }
    public Team Team { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; }
    public Role Role { get; set; }

    // Encrypted team key information
    public required string EncryptedTeamKey { get; set; }
    public int KeyVersion { get; set; }

    // Timestamps
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}