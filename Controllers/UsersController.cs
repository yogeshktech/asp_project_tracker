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
    public UsersController(IUserService userService) => _userService = userService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _userService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
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
    public async Task<IActionResult> Roles() => Ok(await _userService.GetRolesAsync());

    [HttpGet("permissions")]
    public async Task<IActionResult> Permissions() => Ok(await _userService.GetPermissionsAsync());

    [HttpPost("project-permissions")]
    public async Task<IActionResult> SetPermission([FromBody] UserProjectPermissionDto dto)
    {
        await _userService.SetProjectPermissionAsync(dto, UserId);
        return Ok();
    }
}
