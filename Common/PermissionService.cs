using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;

namespace project_tracker_madhu.Common;

public interface IPermissionService
{
    Task<bool> IsAdminAsync(long userId);
    Task<bool> CanViewProjectAsync(long userId, long projectId);
    Task<bool> CanViewModuleAsync(long userId, long projectId, string module);
    Task<bool> CanEditModuleAsync(long userId, long projectId, string module);
    Task<List<long>> GetAccessibleProjectIdsAsync(long userId);
    Task<bool> IsProjectManagerAsync(long userId, long projectId);
}

public class PermissionService : IPermissionService
{
    public static readonly string[] Modules =
    {
        "Projects", "Budgets", "Costs", "BOQ", "Tasks", "Issues", "Reports", "Closure"
    };

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
        var chain = await GetProjectAndAncestorIdsAsync(projectId);
        return await _db.ProjectPermissions.AnyAsync(p =>
            p.UserId == userId && chain.Contains(p.ProjectId) && p.CanView);
    }

    public async Task<bool> CanViewModuleAsync(long userId, long projectId, string module)
    {
        if (await IsAdminAsync(userId)) return true;
        var chain = await GetProjectAndAncestorIdsAsync(projectId);
        return await _db.ProjectPermissions.AnyAsync(p =>
            p.UserId == userId && chain.Contains(p.ProjectId) && p.Module == module && p.CanView);
    }

    public async Task<bool> CanEditModuleAsync(long userId, long projectId, string module)
    {
        if (await IsAdminAsync(userId)) return true;
        var chain = await GetProjectAndAncestorIdsAsync(projectId);
        return await _db.ProjectPermissions.AnyAsync(p =>
            p.UserId == userId && chain.Contains(p.ProjectId) && p.Module == module && p.CanEdit);
    }

    public async Task<List<long>> GetAccessibleProjectIdsAsync(long userId)
    {
        if (await IsAdminAsync(userId))
            return await _db.Projects.Select(p => p.Id).ToListAsync();

        var permitted = await _db.ProjectPermissions
            .Where(p => p.UserId == userId && p.CanView)
            .Select(p => p.ProjectId)
            .Distinct()
            .ToListAsync();
        if (permitted.Count == 0) return new();

        var all = await _db.Projects.AsNoTracking().Select(p => new { p.Id, p.ParentProjectId }).ToListAsync();
        var allowed = new HashSet<long>(permitted);
        bool grew;
        do
        {
            grew = false;
            foreach (var p in all)
            {
                if (p.ParentProjectId.HasValue && allowed.Contains(p.ParentProjectId.Value) && allowed.Add(p.Id))
                    grew = true;
            }
        } while (grew);

        return allowed.ToList();
    }

    public Task<bool> IsProjectManagerAsync(long userId, long projectId) =>
        CanEditModuleAsync(userId, projectId, "Closure");

    private async Task<List<long>> GetProjectAndAncestorIdsAsync(long projectId)
    {
        var ids = new List<long>();
        long? cursor = projectId;
        var guard = 0;
        while (cursor.HasValue && guard++ < 50)
        {
            var row = await _db.Projects.AsNoTracking()
                .Where(p => p.Id == cursor.Value)
                .Select(p => new { p.Id, p.ParentProjectId })
                .FirstOrDefaultAsync();
            if (row == null) break;
            ids.Add(row.Id);
            cursor = row.ParentProjectId;
        }
        return ids;
    }
}
