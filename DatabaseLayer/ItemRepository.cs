using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Items;

public interface IItemRepository
{
    Task<List<Item>> GetAllAsync();
    Task<Item?> GetAsync(long id);
    Task<Item?> GetByCodeAsync(string code);
    Task<Item> AddAsync(Item item);
    Task UpdateAsync(Item item);
    Task DeleteAsync(long id);
    Task<List<Brand>> GetBrandsAsync();
    Task<Brand?> GetBrandAsync(long id);
    Task<Brand> AddBrandAsync(Brand brand);
    Task UpdateBrandAsync(Brand brand);
    Task DeleteBrandAsync(long id);
    Task<List<Unit>> GetUnitsAsync();
    Task<Unit?> GetUnitAsync(long id);
    Task<Unit> AddUnitAsync(Unit unit);
    Task UpdateUnitAsync(Unit unit);
    Task DeleteUnitAsync(long id);
    Task<List<ItemCategory>> GetCategoriesAsync();
    Task<ItemCategory?> GetCategoryAsync(long id);
    Task<ItemCategory> AddCategoryAsync(ItemCategory category);
    Task UpdateCategoryAsync(ItemCategory category);
    Task DeleteCategoryAsync(long id);
}

public class ItemRepository : IItemRepository
{
    private readonly AppDbContext _db;
    public ItemRepository(AppDbContext db) => _db = db;

    public Task<List<Item>> GetAllAsync() =>
        _db.Items.Include(i => i.Brand).Include(i => i.Unit).Include(i => i.Category).AsNoTracking().ToListAsync();

    public Task<Item?> GetAsync(long id) =>
        _db.Items.Include(i => i.Brand).Include(i => i.Unit).Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == id);

    public Task<Item?> GetByCodeAsync(string code) =>
        _db.Items.FirstOrDefaultAsync(i => i.ItemCode.ToLower() == code.ToLower());

    public async Task<Item> AddAsync(Item item)
    {
        _db.Items.Add(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task UpdateAsync(Item item)
    {
        _db.Items.Update(item);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var item = await _db.Items.FindAsync(id) ?? throw new InvalidOperationException("Item not found");
        item.IsActive = false;
        await _db.SaveChangesAsync();
    }

    public Task<List<Brand>> GetBrandsAsync() => _db.Brands.AsNoTracking().OrderBy(b => b.Name).ToListAsync();
    public Task<Brand?> GetBrandAsync(long id) => _db.Brands.FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Brand> AddBrandAsync(Brand brand)
    {
        _db.Brands.Add(brand);
        await _db.SaveChangesAsync();
        return brand;
    }

    public async Task UpdateBrandAsync(Brand brand)
    {
        _db.Brands.Update(brand);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteBrandAsync(long id)
    {
        var brand = await _db.Brands.FindAsync(id) ?? throw new InvalidOperationException("Brand not found");
        _db.Brands.Remove(brand);
        await _db.SaveChangesAsync();
    }

    public Task<List<Unit>> GetUnitsAsync() => _db.Units.AsNoTracking().OrderBy(u => u.Name).ToListAsync();
    public Task<Unit?> GetUnitAsync(long id) => _db.Units.FirstOrDefaultAsync(u => u.Id == id);

    public async Task<Unit> AddUnitAsync(Unit unit)
    {
        _db.Units.Add(unit);
        await _db.SaveChangesAsync();
        return unit;
    }

    public async Task UpdateUnitAsync(Unit unit)
    {
        _db.Units.Update(unit);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteUnitAsync(long id)
    {
        var unit = await _db.Units.FindAsync(id) ?? throw new InvalidOperationException("Unit not found");
        _db.Units.Remove(unit);
        await _db.SaveChangesAsync();
    }

    public Task<List<ItemCategory>> GetCategoriesAsync() => _db.ItemCategories.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
    public Task<ItemCategory?> GetCategoryAsync(long id) => _db.ItemCategories.FirstOrDefaultAsync(c => c.Id == id);

    public async Task<ItemCategory> AddCategoryAsync(ItemCategory category)
    {
        _db.ItemCategories.Add(category);
        await _db.SaveChangesAsync();
        return category;
    }

    public async Task UpdateCategoryAsync(ItemCategory category)
    {
        _db.ItemCategories.Update(category);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteCategoryAsync(long id)
    {
        var cat = await _db.ItemCategories.FindAsync(id) ?? throw new InvalidOperationException("Category not found");
        _db.ItemCategories.Remove(cat);
        await _db.SaveChangesAsync();
    }
}
