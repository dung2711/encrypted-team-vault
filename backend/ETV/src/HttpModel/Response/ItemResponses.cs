namespace ETV.HttpModel.Response;

public class CreateItemResponse
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int KeyVersion { get; set; }
}

public class GetItemResponse
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public required string EncryptedBlob { get; set; }
    public required string EncryptedItemKey { get; set; }
    public int KeyVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class GetTeamItemsResponse
{
    public int Count { get; set; }
    public required List<GetItemResponse> Items { get; set; }
}

public class SuccessMessageResponse
{
    public required string Message { get; set; }
}

public class ErrorResponse
{
    public required string Message { get; set; }
}
