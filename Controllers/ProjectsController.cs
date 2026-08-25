using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Projects;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService) => _projectService = projectService;

    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("resorts")]
    public async Task<IActionResult> Resorts() => Ok(await _projectService.GetResortsAsync());

    [HttpGet("resorts/{id:long}")]
    public async Task<IActionResult> GetResort(long id)
    {
        var resort = await _projectService.GetResortAsync(id);
        return resort == null ? NotFound() : Ok(resort);
    }

    [HttpPost("resorts")]
    public async Task<IActionResult> CreateResort([FromBody] CreateResortRequest request) =>
        Ok(await _projectService.CreateResortAsync(request, UserId));

    [HttpPut("resorts/{id:long}")]
    public async Task<IActionResult> UpdateResort(long id, [FromBody] UpdateResortRequest request)
    {
        var resort = await _projectService.UpdateResortAsync(id, request, UserId);
        return resort == null ? NotFound() : Ok(resort);
    }

    [HttpDelete("resorts/{id:long}")]
    public async Task<IActionResult> DeleteResort(long id)
    {
        await _projectService.DeleteResortAsync(id, UserId);
        return NoContent();
    }

    [HttpGet("properties")]
    public async Task<IActionResult> Properties([FromQuery] long? resortId) =>
        Ok(await _projectService.GetPropertiesAsync(resortId));

    [HttpPost("properties")]
    public async Task<IActionResult> CreateProperty([FromBody] CreatePropertyRequest request) =>
        Ok(await _projectService.CreatePropertyAsync(request, UserId));

    [HttpPut("properties/{id:long}")]
    public async Task<IActionResult> UpdateProperty(long id, [FromBody] UpdatePropertyRequest request)
    {
        var p = await _projectService.UpdatePropertyAsync(id, request, UserId);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpDelete("properties/{id:long}")]
    public async Task<IActionResult> DeleteProperty(long id)
    {
        await _projectService.DeletePropertyAsync(id, UserId);
        return NoContent();
    }

    [HttpGet("types")]
    public async Task<IActionResult> ProjectTypes() => Ok(await _projectService.GetProjectTypesAsync());

    [HttpPost("types")]
    public async Task<IActionResult> CreateProjectType([FromBody] CreateProjectTypeRequest request) =>
        Ok(await _projectService.CreateProjectTypeAsync(request, UserId));

    [HttpPut("types/{id:long}")]
    public async Task<IActionResult> UpdateProjectType(long id, [FromBody] UpdateProjectTypeRequest request)
    {
        var t = await _projectService.UpdateProjectTypeAsync(id, request, UserId);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpDelete("types/{id:long}")]
    public async Task<IActionResult> DeleteProjectType(long id)
    {
        await _projectService.DeleteProjectTypeAsync(id, UserId);
        return NoContent();
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? resortId, [FromQuery] long? parentId) =>
        Ok(await _projectService.GetProjectsForUserAsync(UserId, resortId, parentId));

    [HttpGet("hierarchy/{resortId:long}")]
    public async Task<IActionResult> Hierarchy(long resortId) =>
        Ok(await _projectService.GetHierarchyAsync(UserId, resortId));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var project = await _projectService.GetProjectAsync(UserId, id);
        return project == null ? NotFound() : Ok(project);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
    {
        var created = await _projectService.CreateAsync(UserId, dto);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateProjectDto dto)
    {
        var updated = await _projectService.UpdateAsync(UserId, id, dto);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        await _projectService.DeleteAsync(UserId, id);
        return NoContent();
    }

    [HttpPost("{id:long}/team")]
    public async Task<IActionResult> Assign(long id, [FromBody] AssignProjectUserRequest request)
    {
        await _projectService.AssignUserAsync(UserId, id, request);
        return Ok();
    }

    [HttpDelete("{id:long}/team/{userId:long}")]
    public async Task<IActionResult> RemoveTeamMember(long id, long userId)
    {
        await _projectService.RemoveUserAsync(UserId, id, userId);
        return NoContent();
    }

    [HttpPost("variance-explanations")]
    public async Task<IActionResult> AddVariance([FromBody] VarianceExplanationRequest request)
    {
        await _projectService.AddVarianceExplanationAsync(UserId, request);
        return Ok();
    }

    [HttpGet("{id:long}/variance-explanations")]
    public async Task<IActionResult> GetVariance(long id) =>
        Ok(await _projectService.GetVarianceExplanationsAsync(UserId, id));

    [HttpPost("milestone-templates")]
    public async Task<IActionResult> SaveTemplate([FromBody] MilestoneTemplateRequest request) =>
        Ok(await _projectService.SaveTemplateAsync(request));

    [HttpPost("milestone-templates/clone")]
    public async Task<IActionResult> CloneTemplate([FromBody] CloneTemplateRequest request) =>
        Ok(await _projectService.CloneTemplateAsync(UserId, request));
}
