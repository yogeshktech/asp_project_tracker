using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Notifications;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    public NotificationsController(INotificationService notificationService) => _notificationService = notificationService;

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] CreateNotificationRequest request) =>
        Ok(await _notificationService.SendAsync(request));

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await _notificationService.GetInboxAsync(userId, page, pageSize));
    }

    [HttpPost("{recipientId:long}/read")]
    public async Task<IActionResult> MarkRead(long recipientId)
    {
        await _notificationService.MarkReadAsync(recipientId);
        return Ok();
    }

    [HttpGet("escalation-rules")]
    public async Task<IActionResult> Rules() => Ok(await _notificationService.GetRulesAsync());

    [HttpGet("scheduled")]
    public async Task<IActionResult> Scheduled([FromQuery] long? projectId) =>
        Ok(await _notificationService.GetScheduledAsync(projectId, long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)));

    [HttpPost("scheduled")]
    public async Task<IActionResult> Schedule([FromBody] CreateScheduledNotificationRequest request)
    {
        try
        {
            var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            return Ok(await _notificationService.ScheduleAsync(request, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("scheduled/{id:long}")]
    public async Task<IActionResult> CancelScheduled(long id)
    {
        try
        {
            return await _notificationService.CancelScheduledAsync(id, long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!))
                ? NoContent()
                : NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("escalation-rules")]
    public async Task<IActionResult> CreateRule([FromBody] CreateEscalationRuleRequest request) =>
        Ok(await _notificationService.CreateRuleAsync(request));

    [HttpPut("escalation-rules/{ruleId:long}")]
    public async Task<IActionResult> SetRuleActive(long ruleId, [FromBody] UpdateEscalationRuleRequest request)
    {
        var rule = await _notificationService.SetRuleActiveAsync(ruleId, request.IsActive);
        return rule == null ? NotFound() : Ok(rule);
    }
}
