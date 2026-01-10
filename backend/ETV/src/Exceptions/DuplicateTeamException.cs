namespace ETV.src.Exceptions
{
    /// <summary>
    /// Generic exception được throw khi cố gắng tạo resource với ID/key đã tồn tại
    /// </summary>
    public class AlreadyExistException<T> : Exception
    {
        public object? ResourceKey { get; set; }

        /// <summary>
        /// Tạo AlreadyExistException với resource key
        /// </summary>
        /// <param name="resourceKey">ID/key của resource bị trùng</param>
        public AlreadyExistException(object? resourceKey)
            : base($"{typeof(T).Name} with id '{resourceKey}' already exists.")
        {
            ResourceKey = resourceKey;
        }

        /// <summary>
        /// Tạo AlreadyExistException với message custom
        /// </summary>
        /// <param name="message">Custom error message</param>
        public AlreadyExistException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Tạo AlreadyExistException với message custom và inner exception
        /// </summary>
        /// <param name="message">Custom error message</param>
        /// <param name="innerException">Inner exception</param>
        public AlreadyExistException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
