using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;

namespace project_tracker_madhu.Common;

public interface IPermissionService
{
    Task<bool> IsAdminAsync(long userId);
    Task<bool> CanViewProjectAsync(long userId, long projectId);
    Task<bool> CanViewModuleAsync(long userId, long projectId, string module);
    Task<bool> CanEditModuleAsync(long userId, long projectId, string module);
    Task<bool> CanUpdateModuleAsync(long userId, long projectId, string module);
    Task<bool> CanDeleteModuleAsync(long userId, long projectId, string module);
    Task<bool> CanViewAnyModuleAsync(long userId, string module);
    Task EnsureModuleAsync(long userId, long projectId, string module, string right);
    Task<List<long>> GetAccessibleProjectIdsAsync(long userId);
    Task<bool> IsProjectManagerAsync(long userId, long projectId);
}

public class PermissionService : IPermissionService
{
    public static readonly string[] ProjectModules =
    {
        "Projects", "Budgets", "Costs", "BOQ", "Tasks", "Issues", "Reports", "Closure"
    };

    public static readonly string[] GlobalModules =
    {
        "Dashboard", "Resorts", "Audit", "Module"
    };

    public static readonly string[] Modules = ProjectModules;

    private readonly AppDbContext _db;
    public PermissionService(AppDbContext db) => _db = db;

    public static bool IsGlobalModule(string module) =>
        GlobalModules.Any(m => string.Equals(m, module, StringComparison.OrdinalIgnoreCase));

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
            p.UserId == userId && p.ProjectId != null && chain.Contains(p.ProjectId.Value) && p.CanView);
    }

    public Task<bool> CanViewModuleAsync(long userId, long projectId, string module) =>
        HasRightAsync(userId, projectId, module, "view");

    public Task<bool> CanEditModuleAsync(long userId, long projectId, string module) =>
        HasRightAsync(userId, projectId, module, "edit");

    public Task<bool> CanUpdateModuleAsync(long userId, long projectId, string module) =>
        HasRightAsync(userId, projectId, module, "update");

    public Task<bool> CanDeleteModuleAsync(long userId, long projectId, string module) =>
        HasRightAsync(userId, projectId, module, "delete");

    public async Task<bool> CanViewAnyModuleAsync(long userId, string module)
    {
        if (await IsAdminAsync(userId)) return true;
        return await _db.ProjectPermissions.AnyAsync(p =>
            p.UserId == userId && p.Module == module && p.CanView);
    }

    public async Task EnsureModuleAsync(long userId, long projectId, string module, string right)
    {
        var ok = await HasRightAsync(userId, projectId, module, right);
        if (!ok)
            throw new UnauthorizedAccessException($"No {right} permission on {module}.");
    }

    public async Task<List<long>> GetAccessibleProjectIdsAsync(long userId)
    {
        if (await IsAdminAsync(userId))
            return await _db.Projects.Select(p => p.Id).ToListAsync();

        var permitted = await _db.ProjectPermissions
            .Where(p => p.UserId == userId && p.ProjectId != null && p.CanView)
            .Select(p => p.ProjectId!.Value)
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
        CanUpdateModuleAsync(userId, projectId, "Closure");

    private async Task<bool> HasRightAsync(long userId, long projectId, string module, string right)
    {
        if (await IsAdminAsync(userId)) return true;

        IQueryable<Models.Entities.ProjectPermission> q = _db.ProjectPermissions
            .Where(p => p.UserId == userId && p.Module == module);

        if (IsGlobalModule(module) || projectId <= 0)
        {
            q = q.Where(p => p.ProjectId == null);
        }
        else
        {
            var chain = await GetProjectAndAncestorIdsAsync(projectId);
            q = q.Where(p => p.ProjectId != null && chain.Contains(p.ProjectId.Value));
        }

        return right.ToLowerInvariant() switch
        {
            "view" => await q.AnyAsync(p => p.CanView),
            "edit" => await q.AnyAsync(p => p.CanEdit),
            "update" => await q.AnyAsync(p => p.CanUpdate),
            "delete" => await q.AnyAsync(p => p.CanDelete),
            _ => false
        };
    }

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
