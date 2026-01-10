namespace ETV.HttpModel.Request;

public class CreateItemRequest
{
    /// <summary>
    /// Client-generated UUID v4 for the item.
    /// This ID should be used as AAD (Additional Authenticated Data) when encrypting the item data with AES-GCM.
    /// </summary>
    public required Guid Id { get; set; }
    public required string EncryptedBlob { get; set; }
    public required string EncryptedItemKey { get; set; }
    public int KeyVersion { get; set; }
}