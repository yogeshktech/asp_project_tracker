using System.Security.Claims;

namespace project_tracker_madhu.Common;

public static class UserContext
{
    public static long? GetUserId(ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(id, out var uid) ? uid : null;
    }

    public static bool IsInRole(ClaimsPrincipal user, string role) =>
        user.IsInRole(role);
}
