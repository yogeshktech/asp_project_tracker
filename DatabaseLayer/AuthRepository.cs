using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Authentication;

public interface IAuthRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task UpdateAsync(User user);
}

public class AuthRepository : IAuthRepository
{
    private readonly AppDbContext _db;
    public AuthRepository(AppDbContext db) => _db = db;

    public Task<User?> GetByEmailAsync(string email) =>
        _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }
}
