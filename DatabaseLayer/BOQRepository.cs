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
    Task SetCurrentBaselineAsync(long boqId, long versionId);
    Task<BoqItem?> GetItemAsync(long itemId);
    Task UpdateItemAsync(BoqItem item);
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
            .AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);

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

    public async Task SetCurrentBaselineAsync(long boqId, long versionId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE boq_versions SET is_current_baseline = FALSE WHERE boq_id = {boqId}");
        await _db.Database.ExecuteSqlInterpolatedAsync($"UPDATE boq_versions SET is_current_baseline = TRUE WHERE boq_id = {boqId} AND id = {versionId}");
        await transaction.CommitAsync();
    }

    public Task<BoqItem?> GetItemAsync(long itemId) => _db.BoqItems.FirstOrDefaultAsync(i => i.Id == itemId);

    public async Task UpdateItemAsync(BoqItem item)
    {
        _db.BoqItems.Update(item);
        await _db.SaveChangesAsync();
    }
}
