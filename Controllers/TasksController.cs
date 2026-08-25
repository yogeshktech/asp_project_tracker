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
        Ok(await _taskService.GetMilestonesAsync(projectId));

    [HttpPost("milestones")]
    public async Task<IActionResult> CreateMilestone([FromBody] CreateMilestoneRequest request) =>
        Ok(await _taskService.CreateMilestoneAsync(request, UserId));

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _taskService.GetTasksAsync(projectId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request) =>
        Ok(await _taskService.CreateTaskAsync(request, UserId));

    [HttpPost("subtasks")]
    public async Task<IActionResult> CreateSubTask([FromBody] CreateSubTaskRequest request) =>
        Ok(await _taskService.CreateSubTaskAsync(request, UserId));

    [HttpPost("updates")]
    public async Task<IActionResult> DailyUpdate([FromBody] CreateTaskUpdateRequest request)
    {
        var isOwner = User.IsInRole("ProjectManager") || User.IsInRole("Admin");
        return Ok(await _taskService.AddDailyUpdateAsync(request, UserId, isOwner));
    }

    [HttpPost("bulk-import")]
    public async Task<IActionResult> BulkImport([FromBody] TaskBulkImportRequest request)
    {
        await _taskService.BulkImportUpdatesAsync(request, UserId);
        return Ok();
    }

    [HttpGet("exceptions/{projectId:long}")]
    public async Task<IActionResult> Exceptions(long projectId) =>
        Ok(await _taskService.GetExceptionsAsync(projectId));

    [HttpGet("daily-report/{projectId:long}")]
    public async Task<IActionResult> DailyReport(long projectId, [FromQuery] DateOnly? date) =>
        Ok(await _taskService.GetDailyReportAsync(projectId, date));
}
