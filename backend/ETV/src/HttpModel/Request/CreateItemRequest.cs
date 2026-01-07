namespace ETV.HttpModel.Request;

public class CreateItemRequest
{
    public required string EncryptedBlob { get; set; }
    public required string EncryptedItemKey { get; set; }
    public int KeyVersion { get; set; }
}