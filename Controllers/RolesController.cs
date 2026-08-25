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
    public RolesController(IRoleService roleService) => _roleService = roleService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _roleService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var role = await _roleService.GetByIdAsync(id);
        return role == null ? NotFound() : Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        var created = await _roleService.CreateAsync(request, UserId);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateRoleRequest request)
    {
        var updated = await _roleService.UpdateAsync(id, request, UserId);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        await _roleService.DeleteAsync(id, UserId);
        return NoContent();
    }

    [HttpPut("{id:long}/permissions")]
    public async Task<IActionResult> SetPermissions(long id, [FromBody] AssignRolePermissionsRequest request)
    {
        var role = await _roleService.SetPermissionsAsync(id, request, UserId);
        return role == null ? NotFound() : Ok(role);
    }

    [HttpPut("users/{userId:long}")]
    public async Task<IActionResult> AssignToUser(long userId, [FromBody] AssignUserRolesRequest request)
    {
        await _roleService.AssignRolesToUserAsync(userId, request, UserId);
        return Ok();
    }

    [HttpGet("permissions/all")]
    public async Task<IActionResult> GetPermissions() => Ok(await _roleService.GetPermissionsAsync());

    [HttpGet("permissions/{id:long}")]
    public async Task<IActionResult> GetPermission(long id)
    {
        var permission = await _roleService.GetPermissionAsync(id);
        return permission == null ? NotFound() : Ok(permission);
    }

    [HttpPost("permissions")]
    public async Task<IActionResult> CreatePermission([FromBody] CreatePermissionRequest request)
    {
        var created = await _roleService.CreatePermissionAsync(request, UserId);
        return CreatedAtAction(nameof(GetPermission), new { id = created.Id }, created);
    }

    [HttpPut("permissions/{id:long}")]
    public async Task<IActionResult> UpdatePermission(long id, [FromBody] UpdatePermissionRequest request)
    {
        var updated = await _roleService.UpdatePermissionAsync(id, request, UserId);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("permissions/{id:long}")]
    public async Task<IActionResult> DeletePermission(long id)
    {
        await _roleService.DeletePermissionAsync(id, UserId);
        return NoContent();
    }
}
