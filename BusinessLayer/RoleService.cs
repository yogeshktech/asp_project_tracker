using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Roles;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Roles;

public interface IRoleService
{
    Task<List<RoleResponseDto>> GetAllAsync();
    Task<RoleResponseDto?> GetByIdAsync(long id);
    Task<RoleResponseDto> CreateAsync(CreateRoleRequest request, long? actorId);
    Task<RoleResponseDto?> UpdateAsync(long id, UpdateRoleRequest request, long? actorId);
    Task DeleteAsync(long id, long? actorId);
    Task<RoleResponseDto?> SetPermissionsAsync(long roleId, AssignRolePermissionsRequest request, long? actorId);
    Task AssignRolesToUserAsync(long userId, AssignUserRolesRequest request, long? actorId);

    Task<List<PermissionResponseDto>> GetPermissionsAsync();
    Task<PermissionResponseDto?> GetPermissionAsync(long id);
    Task<PermissionResponseDto> CreatePermissionAsync(CreatePermissionRequest request, long? actorId);
    Task<PermissionResponseDto?> UpdatePermissionAsync(long id, UpdatePermissionRequest request, long? actorId);
    Task DeletePermissionAsync(long id, long? actorId);
}

public class RoleService : IRoleService
{
    private readonly IRoleRepository _repository;
    private readonly IAuditService _audit;

    public RoleService(IRoleRepository repository, IAuditService audit)
    {
        _repository = repository;
        _audit = audit;
    }

    public async Task<List<RoleResponseDto>> GetAllAsync() =>
        (await _repository.GetAllAsync()).Select(MapRole).ToList();

    public async Task<RoleResponseDto?> GetByIdAsync(long id)
    {
        var role = await _repository.GetByIdAsync(id);
        return role == null ? null : MapRole(role);
    }

    public async Task<RoleResponseDto> CreateAsync(CreateRoleRequest request, long? actorId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Role name is required.");

        var existing = await _repository.GetByNameAsync(request.Name.Trim());
        if (existing != null)
            throw new InvalidOperationException("Role name already exists.");

        var role = await _repository.AddAsync(new Role
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        }, request.PermissionIds);

        await _audit.LogAsync(actorId, "Create", "Role", role.Id, role.Name);
        return MapRole(role);
    }

    public async Task<RoleResponseDto?> UpdateAsync(long id, UpdateRoleRequest request, long? actorId)
    {
        var role = await _repository.GetByIdAsync(id);
        if (role == null) return null;

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Role name is required.");

        var duplicate = await _repository.GetByNameAsync(request.Name.Trim());
        if (duplicate != null && duplicate.Id != id)
            throw new InvalidOperationException("Role name already exists.");

        if (role.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase) &&
            !request.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Admin role name cannot be changed.");

        role.Name = request.Name.Trim();
        role.Description = request.Description;
        await _repository.UpdateAsync(role, request.PermissionIds);
        await _audit.LogAsync(actorId, "Update", "Role", id, role.Name);
        return MapRole((await _repository.GetByIdAsync(id))!);
    }

    public async Task DeleteAsync(long id, long? actorId)
    {
        await _repository.DeleteAsync(id);
        await _audit.LogAsync(actorId, "Delete", "Role", id);
    }

    public async Task<RoleResponseDto?> SetPermissionsAsync(long roleId, AssignRolePermissionsRequest request, long? actorId)
    {
        var role = await _repository.GetByIdAsync(roleId);
        if (role == null) return null;
        await _repository.SetPermissionsAsync(roleId, request.PermissionIds);
        await _audit.LogAsync(actorId, "AssignPermissions", "Role", roleId);
        return MapRole((await _repository.GetByIdAsync(roleId))!);
    }

    public async Task AssignRolesToUserAsync(long userId, AssignUserRolesRequest request, long? actorId)
    {
        await _repository.AssignRolesToUserAsync(userId, request.RoleIds);
        await _audit.LogAsync(actorId, "AssignRoles", "User", userId);
    }

    public async Task<List<PermissionResponseDto>> GetPermissionsAsync() =>
        (await _repository.GetPermissionsAsync()).Select(MapPermission).ToList();

    public async Task<PermissionResponseDto?> GetPermissionAsync(long id)
    {
        var permission = await _repository.GetPermissionByIdAsync(id);
        return permission == null ? null : MapPermission(permission);
    }

    public async Task<PermissionResponseDto> CreatePermissionAsync(CreatePermissionRequest request, long? actorId)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Permission code and name are required.");

        var existing = await _repository.GetPermissionByCodeAsync(request.Code.Trim());
        if (existing != null)
            throw new InvalidOperationException("Permission code already exists.");

        var permission = await _repository.AddPermissionAsync(new Permission
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Module = request.Module.Trim(),
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(actorId, "Create", "Permission", permission.Id, permission.Code);
        return MapPermission(permission);
    }

    public async Task<PermissionResponseDto?> UpdatePermissionAsync(long id, UpdatePermissionRequest request, long? actorId)
    {
        var permission = await _repository.GetPermissionByIdAsync(id);
        if (permission == null) return null;

        var duplicate = await _repository.GetPermissionByCodeAsync(request.Code.Trim());
        if (duplicate != null && duplicate.Id != id)
            throw new InvalidOperationException("Permission code already exists.");

        permission.Code = request.Code.Trim();
        permission.Name = request.Name.Trim();
        permission.Module = request.Module.Trim();
        await _repository.UpdatePermissionAsync(permission);
        await _audit.LogAsync(actorId, "Update", "Permission", id, permission.Code);
        return MapPermission(permission);
    }

    public async Task DeletePermissionAsync(long id, long? actorId)
    {
        await _repository.DeletePermissionAsync(id);
        await _audit.LogAsync(actorId, "Delete", "Permission", id);
    }

    private static RoleResponseDto MapRole(Role role) => new()
    {
        Id = role.Id,
        Name = role.Name,
        Description = role.Description,
        CreatedAt = role.CreatedAt,
        Permissions = role.RolePermissions
            .Where(rp => rp.Permission != null)
            .Select(rp => MapPermission(rp.Permission))
            .ToList()
    };

    private static PermissionResponseDto MapPermission(Permission permission) => new()
    {
        Id = permission.Id,
        Code = permission.Code,
        Name = permission.Name,
        Module = permission.Module
    };
}
