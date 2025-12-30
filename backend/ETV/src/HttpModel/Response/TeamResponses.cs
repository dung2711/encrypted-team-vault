namespace ETV.HttpModel.Response;

public class CreateTeamResponse
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GetTeamResponse
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GetTeamsListResponse
{
    public int Count { get; set; }
    public required List<GetTeamResponse> Teams { get; set; }
}

public class TeamMemberDto
{
    public Guid UserId { get; set; }
    public required string Username { get; set; }
    public required string Role { get; set; }
    public int KeyVersion { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class GetTeamMembersResponse
{
    public int Count { get; set; }
    public required List<TeamMemberDto> Members { get; set; }
}

public class GetTeamKeyResponse
{
    public Guid TeamId { get; set; }
    public required string EncryptedTeamKey { get; set; }
    public int KeyVersion { get; set; }
}
