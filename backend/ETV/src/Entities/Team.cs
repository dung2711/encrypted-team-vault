public class Team
{
    public Guid TeamId { get; set; }
    public string TeamName { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<TeamMember> TeamMembers { get; set; }
    public List<VaultItem> VaultItems { get; set; }
}