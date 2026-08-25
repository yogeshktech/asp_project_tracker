using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Budgets;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/budgets")]
public class BudgetsController : ControllerBase
{
    private readonly IBudgetService _budgetService;
    public BudgetsController(IBudgetService budgetService) => _budgetService = budgetService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _budgetService.GetByProjectAsync(UserId, projectId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBudgetRequest request) =>
        Ok(await _budgetService.CreateAsync(request, UserId));

    [HttpPost("{id:long}/revise")]
    public async Task<IActionResult> Revise(long id, [FromBody] BudgetVersionRequest request) =>
        Ok(await _budgetService.ReviseAsync(id, request.TotalAmount, request.Remarks, UserId, request.ApproverId));

    [HttpGet("cost-centers")]
    public async Task<IActionResult> CostCenters([FromQuery] long? projectId) =>
        Ok(await _budgetService.GetCostCentersAsync(projectId));

    [HttpPost("cost-centers")]
    public async Task<IActionResult> CreateCostCenter([FromBody] CreateCostCenterRequest request) =>
        Ok(await _budgetService.CreateCostCenterAsync(request, UserId));

    [HttpPut("cost-centers/{id:long}")]
    public async Task<IActionResult> UpdateCostCenter(long id, [FromBody] UpdateCostCenterRequest request)
    {
        var cc = await _budgetService.UpdateCostCenterAsync(id, request, UserId);
        return cc == null ? NotFound() : Ok(cc);
    }

    [HttpDelete("cost-centers/{id:long}")]
    public async Task<IActionResult> DeleteCostCenter(long id)
    {
        await _budgetService.DeleteCostCenterAsync(id, UserId);
        return NoContent();
    }

    [HttpPost("allocations")]
    public async Task<IActionResult> Allocate([FromBody] CreateAllocationRequest request)
    {
        await _budgetService.AllocateAsync(request, UserId);
        return Ok();
    }
}
