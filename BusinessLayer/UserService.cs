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
    Task<UserResponseDto> CreateAsync(CreateUserRequest request, long? actorId);
    Task<UserResponseDto?> UpdateAsync(long id, UpdateUserRequest request, long? actorId);
    Task<List<Role>> GetRolesAsync();
    Task SetProjectPermissionAsync(UserProjectPermissionDto dto, long? actorId);
    Task<List<Permission>> GetPermissionsAsync();
}

public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IAuditService _audit;

    public UserService(IUserRepository repository, IAuditService audit)
    {
        _repository = repository;
        _audit = audit;
    }

    public async Task<List<UserResponseDto>> GetAllAsync() =>
        (await _repository.GetAllAsync()).Select(Map).ToList();

    public async Task<UserResponseDto?> GetByIdAsync(long id)
    {
        var user = await _repository.GetByIdAsync(id);
        return user == null ? null : Map(user);
    }

    public async Task<UserResponseDto> CreateAsync(CreateUserRequest request, long? actorId)
    {
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
        user = await _repository.AddAsync(user, request.RoleIds);
        foreach (var projectId in request.ProjectIds.Distinct())
        {
            await _repository.AssignToProjectAsync(user.Id, projectId, "Member");
        }
        await _audit.LogAsync(actorId, "Create", "User", user.Id);
        return Map(await _repository.GetByIdAsync(user.Id) ?? user);
    }

    public async Task<UserResponseDto?> UpdateAsync(long id, UpdateUserRequest request, long? actorId)
    {
        var user = await _repository.GetByIdAsync(id);
        if (user == null) return null;
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.IsActive = request.IsActive;
        user.IsInternal = request.IsInternal;
        user.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(user, request.RoleIds);
        await _audit.LogAsync(actorId, "Update", "User", id);
        return Map(await _repository.GetByIdAsync(id) ?? user);
    }

    public Task<List<Role>> GetRolesAsync() => _repository.GetRolesAsync();
    public Task<List<Permission>> GetPermissionsAsync() => _repository.GetPermissionsAsync();

    public async Task SetProjectPermissionAsync(UserProjectPermissionDto dto, long? actorId)
    {
        await _repository.SetProjectPermissionAsync(new ProjectPermission
        {
            ProjectId = dto.ProjectId,
            UserId = dto.UserId,
            Module = dto.Module,
            CanView = dto.CanView,
            CanEdit = dto.CanEdit
        });
        await _audit.LogAsync(actorId, "Permission", "ProjectPermission", dto.ProjectId,
            $"User {dto.UserId} module {dto.Module}");
    }

    private static UserResponseDto Map(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Phone = user.Phone,
        IsActive = user.IsActive,
        IsInternal = user.IsInternal,
        Roles = user.UserRoles.Select(r => r.Role.Name).ToList()
    };
}
