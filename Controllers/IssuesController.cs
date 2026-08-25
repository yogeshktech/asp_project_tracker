using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Issues;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/issues")]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _issueService;
    public IssuesController(IIssueService issueService) => _issueService = issueService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("priorities")]
    public async Task<IActionResult> Priorities() => Ok(await _issueService.GetPrioritiesAsync());

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _issueService.GetByProjectAsync(UserId, projectId));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var issue = await _issueService.GetAsync(UserId, id);
        return issue == null ? NotFound() : Ok(issue);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIssueRequest request) =>
        Ok(await _issueService.CreateAsync(request, UserId));

    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> Comment(long id, [FromBody] CreateIssueCommentRequest request)
    {
        await _issueService.AddCommentAsync(UserId, id, request.Comment);
        return Ok();
    }

    [HttpPost("{id:long}/escalate")]
    public async Task<IActionResult> Escalate(long id)
    {
        await _issueService.EscalateHighPriorityAsync(id);
        return Ok();
    }
}
