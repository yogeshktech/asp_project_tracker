using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Closure;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/closure")]
public class ClosureController : ControllerBase
{
    private readonly IClosureService _closureService;
    public ClosureController(IClosureService closureService) => _closureService = closureService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("inventory/{projectId:long}")]
    public async Task<IActionResult> Inventory(long projectId) =>
        Ok(await _closureService.GetInventoryAsync(projectId));

    [HttpPost("inventory")]
    public async Task<IActionResult> AddInventory([FromBody] CreateInventoryRequest request) =>
        Ok(await _closureService.AddInventoryAsync(request, UserId));

    [HttpPost("close")]
    public async Task<IActionResult> Close([FromBody] ProjectClosureDto dto) =>
        Ok(await _closureService.CloseProjectAsync(dto, UserId));
}
