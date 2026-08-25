using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.BoqModule;

public interface IBOQRepository
{
    Task<List<Boq>> GetByProjectAsync(long projectId);
    Task<Boq?> GetAsync(long id);
    Task<Boq> AddAsync(Boq boq);
    Task<BoqVersion> AddVersionAsync(BoqVersion version);
    Task AddItemsAsync(IEnumerable<BoqItem> items);
}

public class BOQRepository : IBOQRepository
{
    private readonly AppDbContext _db;
    public BOQRepository(AppDbContext db) => _db = db;

    public Task<List<Boq>> GetByProjectAsync(long projectId) =>
        _db.Boqs.Include(b => b.Versions).ThenInclude(v => v.Items)
            .Where(b => b.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<Boq?> GetAsync(long id) =>
        _db.Boqs.Include(b => b.Versions).ThenInclude(v => v.Items)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Boq> AddAsync(Boq boq)
    {
        _db.Boqs.Add(boq);
        await _db.SaveChangesAsync();
        return boq;
    }

    public async Task<BoqVersion> AddVersionAsync(BoqVersion version)
    {
        _db.BoqVersions.Add(version);
        await _db.SaveChangesAsync();
        return version;
    }

    public async Task AddItemsAsync(IEnumerable<BoqItem> items)
    {
        _db.BoqItems.AddRange(items);
        await _db.SaveChangesAsync();
    }
}
