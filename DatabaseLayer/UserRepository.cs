using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Users;

public interface IUserRepository
{
    Task<List<User>> GetAllAsync();
    Task<User?> GetByIdAsync(long id);
    Task<User> AddAsync(User user, IEnumerable<long> roleIds);
    Task UpdateAsync(User user, IEnumerable<long>? roleIds);
    Task<List<Role>> GetRolesAsync();
    Task<List<Permission>> GetPermissionsAsync();
    Task SetProjectPermissionAsync(ProjectPermission permission);
    Task ReplaceProjectPermissionsAsync(long userId, IEnumerable<ProjectPermission> permissions);
    Task<List<ProjectPermission>> GetProjectPermissionsAsync(long userId);
    Task AssignToProjectAsync(long userId, long projectId, string? teamRole);
    Task RemoveFromProjectsExceptAsync(long userId, IEnumerable<long> keepProjectIds);
}

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public Task<List<User>> GetAllAsync() =>
        _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).AsNoTracking().ToListAsync();

    public Task<User?> GetByIdAsync(long id) =>
        _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Id == id);

    public async Task<User> AddAsync(User user, IEnumerable<long> roleIds)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        foreach (var roleId in roleIds.Distinct())
            _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(User user, IEnumerable<long>? roleIds)
    {
        _db.Users.Update(user);
        if (roleIds != null)
        {
            var existing = _db.UserRoles.Where(x => x.UserId == user.Id);
            _db.UserRoles.RemoveRange(existing);
            foreach (var roleId in roleIds.Distinct())
                _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
        }
        await _db.SaveChangesAsync();
    }

    public Task<List<Role>> GetRolesAsync() => _db.Roles.AsNoTracking().ToListAsync();
    public Task<List<Permission>> GetPermissionsAsync() => _db.Permissions.AsNoTracking().ToListAsync();

    public async Task SetProjectPermissionAsync(ProjectPermission permission)
    {
        var existing = await _db.ProjectPermissions.FirstOrDefaultAsync(p =>
            p.ProjectId == permission.ProjectId && p.UserId == permission.UserId && p.Module == permission.Module);
        if (existing == null)
            _db.ProjectPermissions.Add(permission);
        else
        {
            existing.CanView = permission.CanView;
            existing.CanEdit = permission.CanEdit;
        }
        await _db.SaveChangesAsync();
    }

    public async Task ReplaceProjectPermissionsAsync(long userId, IEnumerable<ProjectPermission> permissions)
    {
        var existing = _db.ProjectPermissions.Where(p => p.UserId == userId);
        _db.ProjectPermissions.RemoveRange(existing);
        foreach (var p in permissions)
        {
            p.UserId = userId;
            if (p.CanView || p.CanEdit)
                _db.ProjectPermissions.Add(p);
        }
        await _db.SaveChangesAsync();
    }

    public Task<List<ProjectPermission>> GetProjectPermissionsAsync(long userId) =>
        _db.ProjectPermissions.Where(p => p.UserId == userId).AsNoTracking().ToListAsync();

    public async Task AssignToProjectAsync(long userId, long projectId, string? teamRole)
    {
        if (!await _db.ProjectUsers.AnyAsync(pu => pu.ProjectId == projectId && pu.UserId == userId))
        {
            _db.ProjectUsers.Add(new ProjectUser { ProjectId = projectId, UserId = userId, TeamRole = teamRole });
            await _db.SaveChangesAsync();
        }
    }

    public async Task RemoveFromProjectsExceptAsync(long userId, IEnumerable<long> keepProjectIds)
    {
        var keep = keepProjectIds.Distinct().ToHashSet();
        var extra = await _db.ProjectUsers.Where(pu => pu.UserId == userId && !keep.Contains(pu.ProjectId)).ToListAsync();
        if (extra.Count == 0) return;
        _db.ProjectUsers.RemoveRange(extra);
        await _db.SaveChangesAsync();
    }
}
