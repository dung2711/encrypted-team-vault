using ETV.src.Data;
using ETV.src.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace ETV.Services;

public class TeamService(AppDb context)
{
    /// <summary>
    /// Tạo team mới
    /// Client sinh team key ngẫu nhiên và mã hóa bằng public key của user
    /// </summary>
    public async Task<Team> CreateTeamAsync(string teamName, Guid creatorId, string encryptedTeamKeyForCreator)
    {
        var team = new Team
        {
            TeamId = Guid.NewGuid(),
            TeamName = teamName,
            CreatedAt = DateTimeOffset.UtcNow
        };

        context.Teams.Add(team);

        // Thêm creator là admin với encrypted team key (version = 1)
        var teamMember = new TeamMember
        {
            TeamId = team.TeamId,
            UserId = creatorId,
            Role = Role.Admin,
            EncryptedTeamKey = encryptedTeamKeyForCreator,
            KeyVersion = 1,
            JoinedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        };
        context.TeamMembers.Add(teamMember);

        await context.SaveChangesAsync();
        return team;
    }

    /// <summary>
    /// Lấy danh sách các team mà user đã tham gia
    /// </summary>
    public async Task<List<Team>> GetJoinedTeamsAsync(Guid userId)
    {
        return await context.TeamMembers
            .Where(tm => tm.UserId == userId)
            .Include(tm => tm.Team)
            .Select(tm => tm.Team)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy chi tiết team
    /// </summary>
    public async Task<Team> GetTeamDetailsAsync(Guid teamId)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        return team;
    }

    /// <summary>
    /// Xóa team (cascade delete sẽ xóa items, members, và key shares)
    /// </summary>
    public async Task DeleteTeamAsync(Guid teamId)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        context.Teams.Remove(team);
        await context.SaveChangesAsync();
    }
        
    /// <summary>
    /// Thêm member vào team
    /// Client gửi encrypted team key cho member mới
    /// </summary>
    public async Task AddMemberToTeamAsync(Guid teamId, Guid userId, Role role, string encryptedTeamKey, int keyVersion)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        // Kiểm tra user tồn tại
        var user = await context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new NotFoundException("User", userId);
        }

        // Kiểm tra user đã là member của team chưa
        var existingMember = await context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);

        if (existingMember != null)
        {
            throw new InvalidOperationException($"User with id '{userId}' is already a member of this team.");
        }

        var teamMember = new TeamMember
        {
            TeamId = teamId,
            UserId = userId,
            Role = role,
            EncryptedTeamKey = encryptedTeamKey,
            KeyVersion = keyVersion,
            JoinedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        };

        context.TeamMembers.Add(teamMember);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Xóa member khỏi team
    /// Cần kiểm tra không xóa admin cuối cùng của team
    /// Cascade delete sẽ xóa key shares tự động
    /// </summary>
    public async Task RemoveMemberFromTeamAsync(Guid teamId, Guid userId)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        var teamMember = await context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);

        if (teamMember == null)
        {
            throw new NotFoundException("TeamMember", userId);
        }

        // Nếu là admin, kiểm tra xem có admin khác không
        if (teamMember.Role == Role.Admin)
        {
            var adminCount = await context.TeamMembers
                .CountAsync(tm => tm.TeamId == teamId && tm.Role == Role.Admin);

            if (adminCount <= 1)
            {
                throw new InvalidOperationException("Cannot remove the last admin from the team.");
            }
        }

        context.TeamMembers.Remove(teamMember);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Thay đổi role của member trong team
    /// Không cho phép xóa hết admin của team
    /// </summary>
    public async Task ChangeMemberRoleAsync(Guid teamId, Guid userId, Role newRole)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        var teamMember = await context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);

        if (teamMember == null)
        {
            throw new NotFoundException("TeamMember", userId);
        }

        // Nếu hạ từ admin xuống, kiểm tra có admin khác không
        if (teamMember.Role == Role.Admin && newRole != Role.Admin)
        {
            var adminCount = await context.TeamMembers
                .CountAsync(tm => tm.TeamId == teamId && tm.Role == Role.Admin);

            if (adminCount <= 1)
            {
                throw new InvalidOperationException("Cannot demote the last admin from the team.");
            }
        }

        teamMember.Role = newRole;
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Lấy danh sách members trong team
    /// </summary>
    public async Task<List<TeamMember>> GetTeamMembersAsync(Guid teamId)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        return await context.TeamMembers
            .Where(tm => tm.TeamId == teamId)
            .Include(tm => tm.User)
            .OrderBy(tm => tm.Role)
            .ThenBy(tm => tm.JoinedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Kiểm tra user có phải là admin của team không
    /// </summary>
    public async Task<bool> IsTeamAdminAsync(Guid teamId, Guid userId)
    {
        var teamMember = await context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);

        return teamMember?.Role == Role.Admin;
    }

    /// <summary>
    /// Kiểm tra user có phải là member của team không
    /// </summary>
    public async Task<bool> IsTeamMemberAsync(Guid teamId, Guid userId)
    {
        return await context.TeamMembers
            .AnyAsync(tm => tm.TeamId == teamId && tm.UserId == userId);
    }

    /// <summary>
    /// Lấy key version hiện tại của team (version cao nhất)
    /// </summary>
    public async Task<int> GetCurrentKeyVersionAsync(Guid teamId)
    {
        var team = await context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId);

        if (team == null)
        {
            throw new NotFoundException("Team", teamId);
        }

        var latestKeyVersion = await context.TeamMembers
            .Where(tm => tm.TeamId == teamId)
            .MaxAsync(tm => (int?)tm.KeyVersion) ?? 0;

        return latestKeyVersion;
    }
}