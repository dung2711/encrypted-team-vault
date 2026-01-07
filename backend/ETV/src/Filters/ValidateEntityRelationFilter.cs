using ETV.src.Data;
using ETV.src.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace ETV.src.Filters
{
    /// <summary>
    /// Attribute to validate relationship between two entities
    /// </summary>
    /// <typeparam name="TParent">Parent entity type (e.g., Team)</typeparam>
    /// <typeparam name="TChild">Child entity type (e.g., TeamMember, VaultItem)</typeparam>
    public class ValidateEntityRelationAttribute<TParent, TChild> : TypeFilterAttribute
        where TParent : class
        where TChild : class
    {
        public ValidateEntityRelationAttribute(string parentParamName, string childParamName)
            : base(typeof(ValidateEntityRelationFilter<TParent, TChild>))
        {
            Arguments = new object[] { parentParamName, childParamName };
        }
    }

    /// <summary>
    /// Filter to validate relationship between parent and child entities
    /// Supports: Team-TeamMember, Team-VaultItem relationships
    /// </summary>
    public class ValidateEntityRelationFilter<TParent, TChild> : IAsyncActionFilter
        where TParent : class
        where TChild : class
    {
        private readonly AppDb _context;
        private readonly string _parentParamName;
        private readonly string _childParamName;

        public ValidateEntityRelationFilter(AppDb context, string parentParamName, string childParamName)
        {
            _context = context;
            _parentParamName = parentParamName;
            _childParamName = childParamName;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Lấy parent ID và child ID từ route parameters
            if (!context.ActionArguments.TryGetValue(_parentParamName, out var parentIdObj))
            {
                context.Result = new BadRequestObjectResult(new { message = $"Parent parameter '{_parentParamName}' not found." });
                return;
            }

            if (!context.ActionArguments.TryGetValue(_childParamName, out var childIdObj))
            {
                context.Result = new BadRequestObjectResult(new { message = $"Child parameter '{_childParamName}' not found." });
                return;
            }

            var parentId = (Guid)parentIdObj;
            var childId = (Guid)childIdObj;

            // Kiểm tra mối quan hệ dựa trên type
            var isValid = await ValidateRelationshipAsync(parentId, childId);

            if (!isValid)
            {
                var parentTypeName = typeof(TParent).Name;
                var childTypeName = typeof(TChild).Name;
                context.Result = new NotFoundObjectResult(new
                {
                    message = $"{childTypeName} with id {childId} does not belong to {parentTypeName} with id {parentId}."
                });
                return;
            }

            await next();
        }

        private async Task<bool> ValidateRelationshipAsync(Guid parentId, Guid childId)
        {
            var parentType = typeof(TParent);
            var childType = typeof(TChild);

            // Team - TeamMember relationship
            if (parentType == typeof(Team) && childType == typeof(TeamMember))
            {
                return await _context.TeamMembers
                    .AnyAsync(tm => tm.TeamId == parentId && tm.UserId == childId);
            }

            // Team - VaultItem relationship
            if (parentType == typeof(Team) && childType == typeof(VaultItem))
            {
                return await _context.VaultItems
                    .AnyAsync(vi => vi.TeamId == parentId && vi.Id == childId);
            }

            // User - VaultItem relationship (for personal items)
            if (parentType == typeof(User) && childType == typeof(VaultItem))
            {
                return await _context.VaultItems
                    .AnyAsync(vi => vi.UserId == parentId && vi.Id == childId);
            }
            

            // Nếu không match với các relationship đã định nghĩa, trả về false
            return false;
        }
    }
}
