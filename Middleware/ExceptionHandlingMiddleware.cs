using System.Net;
using System.Text.Json;

namespace project_tracker_madhu.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Access denied");
            await Write(context, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Business rule or DB operation failed");
            var msg = ex.InnerException != null ? $"{ex.Message} (Detail: {ex.InnerException.Message})" : ex.Message;
            await Write(context, HttpStatusCode.BadRequest, msg);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error");
            var msg = ex.InnerException != null ? $"{ex.Message} (Detail: {ex.InnerException.Message})" : ex.Message;
            await Write(context, HttpStatusCode.InternalServerError, msg);
        }
    }

    private static async Task Write(HttpContext context, HttpStatusCode status, string message)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)status;
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message }));
    }
}
