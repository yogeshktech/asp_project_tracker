using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Roles;

public interface IRoleRepository
{
    Task<List<Role>> GetAllAsync();
    Task<Role?> GetByIdAsync(long id);
    Task<Role?> GetByNameAsync(string name);
    Task<Role> AddAsync(Role role, IEnumerable<long> permissionIds);
    Task UpdateAsync(Role role, IEnumerable<long>? permissionIds);
    Task DeleteAsync(long id);
    Task SetPermissionsAsync(long roleId, IEnumerable<long> permissionIds);
    Task<List<Permission>> GetPermissionsAsync();
    Task<Permission?> GetPermissionByIdAsync(long id);
    Task<Permission?> GetPermissionByCodeAsync(string code);
    Task<Permission> AddPermissionAsync(Permission permission);
    Task UpdatePermissionAsync(Permission permission);
    Task DeletePermissionAsync(long id);
    Task AssignRolesToUserAsync(long userId, IEnumerable<long> roleIds);
}

public class RoleRepository : IRoleRepository
{
    private readonly AppDbContext _db;
    public RoleRepository(AppDbContext db) => _db = db;

    public Task<List<Role>> GetAllAsync() =>
        _db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .AsNoTracking().OrderBy(r => r.Name).ToListAsync();

    public Task<Role?> GetByIdAsync(long id) =>
        _db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == id);

    public Task<Role?> GetByNameAsync(string name) =>
        _db.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == name.ToLower());

    public async Task<Role> AddAsync(Role role, IEnumerable<long> permissionIds)
    {
        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        await SetPermissionsAsync(role.Id, permissionIds);
        return (await GetByIdAsync(role.Id))!;
    }

    public async Task UpdateAsync(Role role, IEnumerable<long>? permissionIds)
    {
        _db.Roles.Update(role);
        await _db.SaveChangesAsync();
        if (permissionIds != null)
            await SetPermissionsAsync(role.Id, permissionIds);
    }

    public async Task DeleteAsync(long id)
    {
        var role = await _db.Roles.FindAsync(id) ?? throw new InvalidOperationException("Role not found.");
        if (role.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Admin role cannot be deleted.");

        if (await _db.UserRoles.AnyAsync(ur => ur.RoleId == id))
            throw new InvalidOperationException("Role is assigned to users. Remove assignments first.");

        var rolePerms = _db.RolePermissions.Where(rp => rp.RoleId == id);
        _db.RolePermissions.RemoveRange(rolePerms);
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
    }

    public async Task SetPermissionsAsync(long roleId, IEnumerable<long> permissionIds)
    {
        var existing = _db.RolePermissions.Where(rp => rp.RoleId == roleId);
        _db.RolePermissions.RemoveRange(existing);
        foreach (var permissionId in permissionIds.Distinct())
        {
            if (await _db.Permissions.AnyAsync(p => p.Id == permissionId))
                _db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permissionId });
        }
        await _db.SaveChangesAsync();
    }

    public Task<List<Permission>> GetPermissionsAsync() =>
        _db.Permissions.AsNoTracking().OrderBy(p => p.Module).ThenBy(p => p.Name).ToListAsync();

    public Task<Permission?> GetPermissionByIdAsync(long id) =>
        _db.Permissions.FirstOrDefaultAsync(p => p.Id == id);

    public Task<Permission?> GetPermissionByCodeAsync(string code) =>
        _db.Permissions.FirstOrDefaultAsync(p => p.Code.ToLower() == code.ToLower());

    public async Task<Permission> AddPermissionAsync(Permission permission)
    {
        _db.Permissions.Add(permission);
        await _db.SaveChangesAsync();
        return permission;
    }

    public async Task UpdatePermissionAsync(Permission permission)
    {
        _db.Permissions.Update(permission);
        await _db.SaveChangesAsync();
    }

    public async Task DeletePermissionAsync(long id)
    {
        var permission = await _db.Permissions.FindAsync(id)
            ?? throw new InvalidOperationException("Permission not found.");

        var links = _db.RolePermissions.Where(rp => rp.PermissionId == id);
        _db.RolePermissions.RemoveRange(links);
        _db.Permissions.Remove(permission);
        await _db.SaveChangesAsync();
    }

    public async Task AssignRolesToUserAsync(long userId, IEnumerable<long> roleIds)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == userId))
            throw new InvalidOperationException("User not found.");

        var existing = _db.UserRoles.Where(ur => ur.UserId == userId);
        _db.UserRoles.RemoveRange(existing);
        foreach (var roleId in roleIds.Distinct())
        {
            if (await _db.Roles.AnyAsync(r => r.Id == roleId))
                _db.UserRoles.Add(new UserRole { UserId = userId, RoleId = roleId });
        }
        await _db.SaveChangesAsync();
    }
}
