using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.BoqModule;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/boq")]
public class BOQController : ControllerBase
{
    private readonly IBOQService _boqService;
    public BOQController(IBOQService boqService) => _boqService = boqService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _boqService.GetByProjectAsync(projectId));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var boq = await _boqService.GetAsync(id);
        return boq == null ? NotFound() : Ok(boq);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] BOQImportDto dto) =>
        Ok(await _boqService.ImportAsync(dto, UserId));

    [HttpPost("from-master")]
    public async Task<IActionResult> FromMaster([FromBody] BoqFromMasterRequest request) =>
        Ok(await _boqService.CreateFromMasterAsync(request.ProjectId, request.ItemIds, UserId));
}

public class BoqFromMasterRequest
{
    public long ProjectId { get; set; }
    public List<long> ItemIds { get; set; } = new();
}
