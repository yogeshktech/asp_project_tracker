using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Authentication;
using project_tracker_madhu.DatabaseLayer.Users;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Authentication;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);
    Task LogoutAsync();
}

public class AuthService : IAuthService
{
    private readonly IAuthRepository _repository;
    private readonly IUserRepository _users;
    private readonly IPermissionService _permissions;
    private readonly JwtTokenGenerator _jwt;

    public AuthService(IAuthRepository repository, IUserRepository users, IPermissionService permissions, JwtTokenGenerator jwt)
    {
        _repository = repository;
        _users = users;
        _permissions = permissions;
        _jwt = jwt;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var user = await _repository.GetByEmailAsync(request.Email);
        if (user == null || !user.IsActive || !PasswordUtility.Verify(request.Password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _repository.UpdateAsync(user);

        var roles = user.UserRoles.Select(r => r.Role.Name).ToList();
        var isAdmin = await _permissions.IsAdminAsync(user.Id);
        var perms = (await _users.GetProjectPermissionsAsync(user.Id))
            .Select(p => new UserProjectPermissionDto
            {
                UserId = p.UserId,
                ProjectId = p.ProjectId,
                Module = p.Module,
                CanView = p.CanView,
                CanEdit = p.CanEdit
            }).ToList();
        return new LoginResponseDto
        {
            Token = _jwt.CreateToken(user, roles),
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Roles = isAdmin ? new List<string> { "Admin" } : new List<string> { "User" },
            IsAdmin = isAdmin,
            Permissions = perms
        };
    }

    public Task LogoutAsync() => Task.CompletedTask;
}
