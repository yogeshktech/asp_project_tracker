using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Users;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Users;

public interface IUserService
{
    Task<List<UserResponseDto>> GetAllAsync();
    Task<UserResponseDto?> GetByIdAsync(long id);
    Task<UserResponseDto> CreateAsync(CreateUserRequest request, long actorId);
    Task<UserResponseDto?> UpdateAsync(long id, UpdateUserRequest request, long actorId);
    Task<List<Role>> GetRolesAsync();
    Task SetProjectPermissionAsync(UserProjectPermissionDto dto, long? actorId);
    Task ReplaceAccessAsync(long userId, ReplaceUserAccessRequest request, long actorId);
    Task<UserAccessDto> GetAccessAsync(long userId);
    Task<List<ProjectPermission>> GetProjectPermissionsAsync(long userId);
    Task<List<Permission>> GetPermissionsAsync();
}

public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public UserService(IUserRepository repository, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
    }

    public async Task<List<UserResponseDto>> GetAllAsync() =>
        (await _repository.GetAllAsync()).Select(Map).ToList();

    public async Task<UserResponseDto?> GetByIdAsync(long id)
    {
        var user = await _repository.GetByIdAsync(id);
        return user == null ? null : Map(user);
    }

    public async Task<UserResponseDto> CreateAsync(CreateUserRequest request, long actorId)
    {
        await EnsureAdminActorAsync(actorId);
        var roleIds = await RoleIdsForAdminFlagAsync(request.IsAdmin);
        var user = new User
        {
            Email = request.Email,
            FullName = request.FullName,
            Phone = request.Phone,
            PasswordHash = PasswordUtility.Hash(request.Password),
            IsActive = true,
            IsInternal = request.IsInternal,
            CreatedAt = DateTime.UtcNow
        };
        user = await _repository.AddAsync(user, roleIds);
        await ApplyPermissionsAsync(user.Id, request.IsAdmin, request.Permissions);
        await _audit.LogAsync(actorId, "Create", "User", user.Id);
        return Map(await _repository.GetByIdAsync(user.Id) ?? user);
    }

    public async Task<UserResponseDto?> UpdateAsync(long id, UpdateUserRequest request, long actorId)
    {
        await EnsureAdminActorAsync(actorId);
        var user = await _repository.GetByIdAsync(id);
        if (user == null) return null;
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.IsActive = request.IsActive;
        user.IsInternal = request.IsInternal;
        user.UpdatedAt = DateTime.UtcNow;
        var roleIds = await RoleIdsForAdminFlagAsync(request.IsAdmin);
        await _repository.UpdateAsync(user, roleIds);
        await _audit.LogAsync(actorId, "Update", "User", id);
        return Map(await _repository.GetByIdAsync(id) ?? user);
    }

    public Task<List<Role>> GetRolesAsync() => _repository.GetRolesAsync();
    public Task<List<Permission>> GetPermissionsAsync() => _repository.GetPermissionsAsync();
    public Task<List<ProjectPermission>> GetProjectPermissionsAsync(long userId) =>
        _repository.GetProjectPermissionsAsync(userId);

    public async Task<UserAccessDto> GetAccessAsync(long userId)
    {
        var isAdmin = await _permissions.IsAdminAsync(userId);
        var perms = (await _repository.GetProjectPermissionsAsync(userId))
            .Select(p => new UserProjectPermissionDto
            {
                UserId = p.UserId,
                ProjectId = p.ProjectId,
                Module = p.Module,
                CanView = p.CanView,
                CanEdit = p.CanEdit
            }).ToList();
        return new UserAccessDto { IsAdmin = isAdmin, Permissions = perms };
    }

    public async Task SetProjectPermissionAsync(UserProjectPermissionDto dto, long? actorId)
    {
        if (actorId.HasValue) await EnsureAdminActorAsync(actorId.Value);
        await _repository.SetProjectPermissionAsync(new ProjectPermission
        {
            ProjectId = dto.ProjectId,
            UserId = dto.UserId,
            Module = dto.Module,
            CanView = dto.CanView || dto.CanEdit,
            CanEdit = dto.CanEdit
        });
        await _audit.LogAsync(actorId, "Permission", "ProjectPermission", dto.ProjectId,
            $"User {dto.UserId} module {dto.Module}");
    }

    public async Task ReplaceAccessAsync(long userId, ReplaceUserAccessRequest request, long actorId)
    {
        await EnsureAdminActorAsync(actorId);
        var user = await _repository.GetByIdAsync(userId) ?? throw new InvalidOperationException("User not found");
        var roleIds = await RoleIdsForAdminFlagAsync(request.IsAdmin);
        await _repository.UpdateAsync(user, roleIds);
        await ApplyPermissionsAsync(userId, request.IsAdmin, request.Permissions);
        await _audit.LogAsync(actorId, "Permission", "User", userId, request.IsAdmin ? "Admin" : "User-based matrix");
    }

    private async Task ApplyPermissionsAsync(long userId, bool isAdmin, List<UserProjectPermissionDto>? permissions)
    {
        if (isAdmin)
        {
            await _repository.ReplaceProjectPermissionsAsync(userId, Array.Empty<ProjectPermission>());
            return;
        }

        var rows = (permissions ?? new())
            .Where(p => p.CanView || p.CanEdit)
            .Select(p => new ProjectPermission
            {
                UserId = userId,
                ProjectId = p.ProjectId,
                Module = p.Module,
                CanView = p.CanView || p.CanEdit,
                CanEdit = p.CanEdit
            }).ToList();
        await _repository.ReplaceProjectPermissionsAsync(userId, rows);

        var keepProjects = rows.Select(r => r.ProjectId).Distinct().ToList();
        foreach (var projectId in keepProjects)
            await _repository.AssignToProjectAsync(userId, projectId, "Member");
        await _repository.RemoveFromProjectsExceptAsync(userId, keepProjects);
    }

    private async Task<List<long>> RoleIdsForAdminFlagAsync(bool isAdmin)
    {
        if (!isAdmin) return new();
        var roles = await _repository.GetRolesAsync();
        var admin = roles.FirstOrDefault(r => r.Name == "Admin")
            ?? throw new InvalidOperationException("Admin role is missing.");
        return new List<long> { admin.Id };
    }

    private async Task EnsureAdminActorAsync(long actorId)
    {
        if (!await _permissions.IsAdminAsync(actorId))
            throw new UnauthorizedAccessException("Only Admin can manage users and access rights.");
    }

    private static UserResponseDto Map(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Phone = user.Phone,
        IsActive = user.IsActive,
        IsInternal = user.IsInternal,
        IsAdmin = user.UserRoles.Any(r => r.Role.Name == "Admin"),
        Roles = user.UserRoles.Select(r => r.Role.Name).ToList()
    };
}
