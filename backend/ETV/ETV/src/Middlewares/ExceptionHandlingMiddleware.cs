using System.Text.Json;
using ETV.src.Exceptions;

namespace ETV.src.Middlewares
{
    /// <summary>
    /// Middleware để xử lý centralized exception handling
    /// Bắt các exception từ controllers và trả về response phù hợp
    /// </summary>
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var response = new ErrorResponse();

            switch (exception)
            {
                case NotFoundException notFoundEx:
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    response.Message = notFoundEx.Message;
                    response.StatusCode = 404;
                    break;

                case InvalidOperationException invalidOpEx:
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    response.Message = invalidOpEx.Message;
                    response.StatusCode = 400;
                    break;

                case ArgumentException argEx:
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    response.Message = argEx.Message;
                    response.StatusCode = 400;
                    break;

                default:
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    response.Message = "An unexpected error occurred. Please try again later.";
                    response.StatusCode = 500;
                    break;
            }

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return context.Response.WriteAsJsonAsync(response, options);
        }
    }

    /// <summary>
    /// Model cho error response
    /// </summary>
    public class ErrorResponse
    {
        public int StatusCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Details { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
