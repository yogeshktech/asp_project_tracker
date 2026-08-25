using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;

namespace project_tracker_madhu.Common;

public interface IPermissionService
{
    Task<bool> IsAdminAsync(long userId);
    Task<bool> CanViewProjectAsync(long userId, long projectId);
    Task<bool> CanEditModuleAsync(long userId, long projectId, string module);
    Task<List<long>> GetAccessibleProjectIdsAsync(long userId);
    Task<bool> IsProjectManagerAsync(long userId, long projectId);
}

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _db;
    public PermissionService(AppDbContext db) => _db = db;

    public async Task<bool> IsAdminAsync(long userId)
    {
        return await _db.UserRoles
            .Include(ur => ur.Role)
            .AnyAsync(ur => ur.UserId == userId && ur.Role.Name == "Admin");
    }

    public async Task<bool> CanViewProjectAsync(long userId, long projectId)
    {
        if (await IsAdminAsync(userId)) return true;
        if (await _db.Projects.AnyAsync(p => p.Id == projectId && p.OwnerId == userId)) return true;
        if (await _db.ProjectUsers.AnyAsync(pu => pu.ProjectId == projectId && pu.UserId == userId)) return true;
        return await _db.ProjectPermissions.AnyAsync(p =>
            p.ProjectId == projectId && p.UserId == userId && p.CanView);
    }

    public async Task<bool> CanEditModuleAsync(long userId, long projectId, string module)
    {
        if (await IsAdminAsync(userId)) return true;
        if (await _db.Projects.AnyAsync(p => p.Id == projectId && p.OwnerId == userId)) return true;
        // Creators / managers on the team can edit even if OwnerId was not set at create time
        if (await _db.ProjectUsers.AnyAsync(pu =>
                pu.ProjectId == projectId && pu.UserId == userId &&
                pu.TeamRole != null &&
                (pu.TeamRole == "Creator" ||
                 pu.TeamRole.ToLower().Contains("manager"))))
            return true;
        return await _db.ProjectPermissions.AnyAsync(p =>
            p.ProjectId == projectId && p.UserId == userId && p.Module == module && p.CanEdit);
    }

    public async Task<List<long>> GetAccessibleProjectIdsAsync(long userId)
    {
        if (await IsAdminAsync(userId))
            return await _db.Projects.Select(p => p.Id).ToListAsync();

        var fromTeam = _db.ProjectUsers.Where(pu => pu.UserId == userId).Select(pu => pu.ProjectId);
        var fromPerm = _db.ProjectPermissions.Where(p => p.UserId == userId && p.CanView).Select(p => p.ProjectId);
        var owned = _db.Projects.Where(p => p.OwnerId == userId).Select(p => p.Id);
        return await fromTeam.Union(fromPerm).Union(owned).Distinct().ToListAsync();
    }

    public async Task<bool> IsProjectManagerAsync(long userId, long projectId)
    {
        if (await IsAdminAsync(userId)) return true;
        if (await _db.Projects.AnyAsync(p => p.Id == projectId && p.OwnerId == userId)) return true;
        return await _db.ProjectUsers.AnyAsync(pu =>
            pu.ProjectId == projectId && pu.UserId == userId &&
            pu.TeamRole != null && pu.TeamRole.ToLower().Contains("manager"));
    }
}
