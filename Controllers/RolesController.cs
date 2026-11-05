using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Roles;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/roles")]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;
    private readonly IPermissionService _permissions;
    public RolesController(IRoleService roleService, IPermissionService permissions)
    {
        _roleService = roleService;
        _permissions = permissions;
    }
    private long UserId => UserContext.GetUserId(User)!.Value;
    private async Task<bool> IsAdminAsync() => await _permissions.IsAdminAsync(UserId);

    [HttpGet]
    public async Task<IActionResult> GetAll() => await IsAdminAsync() ? Ok(await _roleService.GetAllAsync()) : Forbid();

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (!await IsAdminAsync()) return Forbid();
        var role = await _roleService.GetByIdAsync(id);
        return role == null ? NotFound() : Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        var created = await _roleService.CreateAsync(request, UserId);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateRoleRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        var updated = await _roleService.UpdateAsync(id, request, UserId);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!await IsAdminAsync()) return Forbid();
        await _roleService.DeleteAsync(id, UserId);
        return NoContent();
    }

    [HttpPut("{id:long}/permissions")]
    public async Task<IActionResult> SetPermissions(long id, [FromBody] AssignRolePermissionsRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        var role = await _roleService.SetPermissionsAsync(id, request, UserId);
        return role == null ? NotFound() : Ok(role);
    }

    [HttpPut("users/{userId:long}")]
    public async Task<IActionResult> AssignToUser(long userId, [FromBody] AssignUserRolesRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        await _roleService.AssignRolesToUserAsync(userId, request, UserId);
        return Ok();
    }

    [HttpGet("permissions/all")]
    public async Task<IActionResult> GetPermissions() => await IsAdminAsync() ? Ok(await _roleService.GetPermissionsAsync()) : Forbid();

    [HttpGet("permissions/{id:long}")]
    public async Task<IActionResult> GetPermission(long id)
    {
        if (!await IsAdminAsync()) return Forbid();
        var permission = await _roleService.GetPermissionAsync(id);
        return permission == null ? NotFound() : Ok(permission);
    }

    [HttpPost("permissions")]
    public async Task<IActionResult> CreatePermission([FromBody] CreatePermissionRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        var created = await _roleService.CreatePermissionAsync(request, UserId);
        return CreatedAtAction(nameof(GetPermission), new { id = created.Id }, created);
    }

    [HttpPut("permissions/{id:long}")]
    public async Task<IActionResult> UpdatePermission(long id, [FromBody] UpdatePermissionRequest request)
    {
        if (!await IsAdminAsync()) return Forbid();
        var updated = await _roleService.UpdatePermissionAsync(id, request, UserId);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("permissions/{id:long}")]
    public async Task<IActionResult> DeletePermission(long id)
    {
        if (!await IsAdminAsync()) return Forbid();
        await _roleService.DeletePermissionAsync(id, UserId);
        return NoContent();
    }
}
