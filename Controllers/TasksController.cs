using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Tasks;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    public TasksController(ITaskService taskService) => _taskService = taskService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("milestones/{projectId:long}")]
    public async Task<IActionResult> Milestones(long projectId) =>
        Ok(await _taskService.GetMilestonesAsync(projectId, UserId));

    [HttpPost("milestones")]
    public async Task<IActionResult> CreateMilestone([FromBody] CreateMilestoneRequest request)
    {
        try { return Ok(await _taskService.CreateMilestoneAsync(request, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("milestones/{id:long}")]
    public async Task<IActionResult> UpdateMilestone(long id, [FromBody] CreateMilestoneRequest request)
    {
        try { return Ok(await _taskService.UpdateMilestoneAsync(id, request, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _taskService.GetTasksAsync(projectId, UserId));

    [HttpGet("history/{taskId:long}")]
    public async Task<IActionResult> History(long taskId, [FromQuery] long? subTaskId)
    {
        try { return Ok(await _taskService.GetTaskHistoryAsync(taskId, subTaskId, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request)
    {
        try { return Ok(await _taskService.CreateTaskAsync(request, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateTaskRequest request)
    {
        try { return Ok(await _taskService.UpdateTaskAsync(id, request, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        await _taskService.DeleteTaskAsync(id, UserId);
        return NoContent();
    }

    [HttpPut("{id:long}/dependency")]
    public async Task<IActionResult> SetDependency(long id, [FromBody] SetTaskDependencyRequest request)
    {
        await _taskService.SetTaskDependencyAsync(id, request, UserId);
        return NoContent();
    }

    [HttpPut("subtasks/{id:long}/dependency")]
    public async Task<IActionResult> SetSubTaskDependency(long id, [FromBody] SetTaskDependencyRequest request)
    {
        await _taskService.SetSubTaskDependencyAsync(id, request, UserId);
        return NoContent();
    }

    [HttpPost("subtasks")]
    public async Task<IActionResult> CreateSubTask([FromBody] CreateSubTaskRequest request) =>
        Ok(await _taskService.CreateSubTaskAsync(request, UserId));

    [HttpDelete("subtasks/{id:long}")]
    public async Task<IActionResult> DeleteSubTask(long id)
    {
        await _taskService.DeleteSubTaskAsync(id, UserId);
        return NoContent();
    }

    [HttpPost("updates")]
    public async Task<IActionResult> DailyUpdate([FromBody] CreateTaskUpdateRequest request)
    {
        try { return Ok(await _taskService.AddDailyUpdateAsync(request, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("bulk-import")]
    public async Task<IActionResult> BulkImport([FromBody] TaskBulkImportRequest request) =>
        Ok(await _taskService.BulkImportUpdatesAsync(request, UserId));

    [HttpGet("exceptions/{projectId:long}")]
    public async Task<IActionResult> Exceptions(long projectId) =>
        Ok(await _taskService.GetExceptionsAsync(projectId, UserId));

    [HttpGet("daily-report/{projectId:long}")]
    public async Task<IActionResult> DailyReport(long projectId, [FromQuery] DateOnly? date) =>
        Ok(await _taskService.GetDailyReportAsync(projectId, date, UserId));
}
