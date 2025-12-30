namespace ETV.HttpModel.Request;

public class CreateTeamRequest
{
    public required string TeamName { get; set; }
    public required string EncryptedTeamKeyForCreator { get; set; }
}

public class AddMemberRequest
{
    public Guid UserId { get; set; }
    public required string EncryptedTeamKey { get; set; }
}

public class UpdateTeamKeysRequest
{
    public required List<TeamKeyUpdate> Keys { get; set; }
}

public class TeamKeyUpdate
{
    public Guid UserId { get; set; }
    public required string EncryptedTeamKey { get; set; }
    public int KeyVersion { get; set; }
}
