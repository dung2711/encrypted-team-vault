namespace ETV.src.Exceptions
{
    /// <summary>
    /// Custom exception được throw khi một resource không tìm thấy
    /// </summary>
    public class NotFoundException : Exception
    {
        public string? ResourceName { get; set; }
        public object? ResourceKey { get; set; }

        /// <summary>
        /// Tạo NotFoundException với tên resource và key
        /// </summary>
        /// <param name="resourceName">Tên của resource (ví dụ: "Item", "Team", "User")</param>
        /// <param name="key">Giá trị key của resource (ID, Name, v.v.)</param>
        public NotFoundException(string resourceName, object key)
            : base($"{resourceName} with id '{key}' was not found.")
        {
            ResourceName = resourceName;
            ResourceKey = key;
        }

        /// <summary>
        /// Tạo NotFoundException với message custom
        /// </summary>
        /// <param name="message">Custom error message</param>
        public NotFoundException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Tạo NotFoundException với message custom và inner exception
        /// </summary>
        /// <param name="message">Custom error message</param>
        /// <param name="innerException">Inner exception</param>
        public NotFoundException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
