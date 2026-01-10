namespace ETV.HttpModel.Request;

public class CreateTeamRequest
{
    /// <summary>
    /// Client-generated UUID v4 for the team.
    /// This ID should be used as AAD (Additional Authenticated Data) when encrypting the team key with AES-GCM.
    /// </summary>
    public required Guid Id { get; set; }
    public required string TeamName { get; set; }
    public required string EncryptedTeamKeyForCreator { get; set; }
}

public class AddMemberRequest
{
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

public class UpdateMemberKeyRequest
{
    public required string EncryptedTeamKey { get; set; }
    public int KeyVersion { get; set; }
}
