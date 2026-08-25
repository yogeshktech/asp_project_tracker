using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync())
            return;

        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin", Description = "Full system access", CreatedAt = DateTime.UtcNow };
            db.Roles.Add(adminRole);
            await db.SaveChangesAsync();
        }

        var admin = new User
        {
            Email = "admin@wisetrack.local",
            FullName = "System Admin",
            PasswordHash = PasswordUtility.Hash("Admin@123"),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });
        await db.SaveChangesAsync();
    }
}
