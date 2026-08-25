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
    public async Task<IActionResult> Inbox()
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await _notificationService.GetInboxAsync(userId));
    }

    [HttpPost("{recipientId:long}/read")]
    public async Task<IActionResult> MarkRead(long recipientId)
    {
        await _notificationService.MarkReadAsync(recipientId);
        return Ok();
    }

    [HttpGet("escalation-rules")]
    public async Task<IActionResult> Rules() => Ok(await _notificationService.GetRulesAsync());

    [HttpPost("escalation-rules")]
    public async Task<IActionResult> CreateRule([FromBody] CreateEscalationRuleRequest request) =>
        Ok(await _notificationService.CreateRuleAsync(request));
}
