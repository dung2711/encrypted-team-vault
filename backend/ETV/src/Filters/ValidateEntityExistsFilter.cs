// Attribute bọc ngoài để dễ gọi
using ETV.src.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ETV.src.Filters
{
    public class ValidateEntityExistsAttribute<T> : TypeFilterAttribute where T : class
    {
        public ValidateEntityExistsAttribute(string paramName = "id")
            : base(typeof(ValidateEntityExistsFilter<T>))
        {
            Arguments = new object[] { paramName };
        }
    }

    // Logic chính
    public class ValidateEntityExistsFilter<T> : IAsyncActionFilter where T : class
    {
        private readonly AppDb _context;
        private readonly string _paramName;

        public ValidateEntityExistsFilter(AppDb context, string paramName)
        {
            _context = context;
            _paramName = paramName;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Lấy ID từ arguments dựa vào tên tham số (mặc định là "id")
            if (context.ActionArguments.TryGetValue(_paramName, out var idObj))
            {
                // Tìm entity dựa trên Primary Key (Find/FindAsync tìm theo PK)
                var entity = await _context.Set<T>().FindAsync(idObj);

                if (entity == null)
                {
                    context.Result = new NotFoundObjectResult(new { message = $"{typeof(T).Name} with id {idObj} not found." });
                    return;
                }
            }

            await next();
        }
    }
}