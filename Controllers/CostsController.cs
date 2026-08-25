using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Costs;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/costs")]
public class CostsController : ControllerBase
{
    private readonly ICostService _costService;
    public CostsController(ICostService costService) => _costService = costService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("purchases/{projectId:long}")]
    public async Task<IActionResult> Purchases(long projectId) =>
        Ok(await _costService.GetPurchasesAsync(UserId, projectId));

    [HttpPost("purchases")]
    public async Task<IActionResult> AddPurchase([FromBody] CreatePurchaseCostRequest request) =>
        Ok(await _costService.AddPurchaseAsync(request, UserId));

    [HttpGet("actuals/{projectId:long}")]
    public async Task<IActionResult> Actuals(long projectId) =>
        Ok(await _costService.GetActualsAsync(UserId, projectId));

    [HttpPost("actuals")]
    public async Task<IActionResult> AddActual([FromBody] CreateActualCostRequest request) =>
        Ok(await _costService.AddActualAsync(request, UserId));

    [HttpGet("variance/{projectId:long}")]
    public async Task<IActionResult> Variance(long projectId) =>
        Ok(await _costService.GetVarianceAsync(UserId, projectId));
}
