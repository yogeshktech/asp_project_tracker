using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Users;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IPermissionService _permissions;
    public UsersController(IUserService userService, IPermissionService permissions)
    {
        _userService = userService;
        _permissions = permissions;
    }
    private long UserId => UserContext.GetUserId(User)!.Value;
    private async Task<bool> IsAdminAsync() => await _permissions.IsAdminAsync(UserId);

    [HttpGet]
    public async Task<IActionResult> GetAll() => await IsAdminAsync() ? Ok(await _userService.GetAllAsync()) : Forbid();

    [HttpGet("me/access")]
    public async Task<IActionResult> MyAccess() => Ok(await _userService.GetAccessAsync(UserId));

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var user = await _userService.GetByIdAsync(UserId);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateMyProfileRequest request)
    {
        try
        {
            var user = await _userService.UpdateMyProfileAsync(UserId, request);
            return user == null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeMyPassword([FromBody] ChangeMyPasswordRequest request)
    {
        try
        {
            return await _userService.ChangeMyPasswordAsync(UserId, request)
                ? Ok(new { message = "Password updated." }) : NotFound();
        }
        catch (UnauthorizedAccessException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (id != UserId && !await IsAdminAsync()) return Forbid();
        var user = await _userService.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var created = await _userService.CreateAsync(request, UserId);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateUserRequest request)
    {
        var updated = await _userService.UpdateAsync(id, request, UserId);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpGet("roles")]
    public async Task<IActionResult> Roles() => await IsAdminAsync() ? Ok(await _userService.GetRolesAsync()) : Forbid();

    [HttpGet("permissions")]
    public async Task<IActionResult> Permissions() => await IsAdminAsync() ? Ok(await _userService.GetPermissionsAsync()) : Forbid();

    [HttpGet("{id:long}/project-permissions")]
    public async Task<IActionResult> GetPermissions(long id) =>
        id != UserId && !await IsAdminAsync() ? Forbid() : Ok(await _userService.GetProjectPermissionsAsync(id));

    [HttpPost("project-permissions")]
    public async Task<IActionResult> SetPermission([FromBody] UserProjectPermissionDto dto)
    {
        if (!await IsAdminAsync()) return Forbid();
        await _userService.SetProjectPermissionAsync(dto, UserId);
        return Ok();
    }

    [HttpPut("{id:long}/access")]
    public async Task<IActionResult> ReplaceAccess(long id, [FromBody] ReplaceUserAccessRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        await _userService.ReplaceAccessAsync(id, request, UserId);
        return Ok(await _userService.GetAccessAsync(id));
    }

    [HttpGet("{id:long}/access")]
    public async Task<IActionResult> GetAccess(long id) =>
        id != UserId && !await IsAdminAsync() ? Forbid() : Ok(await _userService.GetAccessAsync(id));
}
