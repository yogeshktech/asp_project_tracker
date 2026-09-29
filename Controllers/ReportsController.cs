using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Reports;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    public ReportsController(IReportService reportService) => _reportService = reportService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _reportService.GetAllAsync(UserId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReportRequest request) =>
        Ok(await _reportService.CreateAsync(request, UserId));

    [HttpGet("{id:long}/export.csv")]
    public async Task<IActionResult> ExportCsv(long id)
    {
        var (content, fileName) = await _reportService.ExportCsvAsync(UserId, id);
        return File(content, "text/csv; charset=utf-8", fileName);
    }

    [HttpGet("portfolio")]
    public async Task<IActionResult> Portfolio() =>
        Ok(await _reportService.GetPortfolioReportAsync(UserId));

    [HttpGet("daily/{projectId:long}")]
    public async Task<IActionResult> Daily(long projectId, [FromQuery] DateOnly? date, [FromQuery] bool cumulative = false)
    {
        var report = await _reportService.GetDailyReportAsync(UserId, projectId, date, cumulative);
        return report == null ? NotFound() : Ok(report);
    }

    [HttpPost("comparable")]
    public async Task<IActionResult> Comparable([FromBody] ReportFilterDto filter) =>
        Ok(await _reportService.GetComparableProjectsAsync(UserId, filter));
}
