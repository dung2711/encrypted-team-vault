public class UpdateItemRequest
{
    public string EncryptedBlob { get; set; }
    public string EncryptedItemKey { get; set; }
    public int KeyVersion { get; set; }
}