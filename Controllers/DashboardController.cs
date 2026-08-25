using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Reports;
using project_tracker_madhu.Common;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = UserContext.GetUserId(User)!.Value;
        return Ok(await _dashboardService.GetAsync(userId));
    }
}
