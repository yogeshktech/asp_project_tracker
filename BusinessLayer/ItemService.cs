using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Items;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.BusinessLayer.Items;

public interface IItemService
{
    Task<List<Item>> GetAllAsync();
    Task<Item?> GetAsync(long id);
    Task<Item> CreateAsync(CreateItemRequest request, long? userId);
    Task<Item?> UpdateAsync(long id, CreateItemRequest request, long? userId);
    Task DeleteAsync(long id, long? userId);
    Task<List<Brand>> GetBrandsAsync();
    Task<Brand> CreateBrandAsync(string name, long? userId);
    Task<Brand?> UpdateBrandAsync(long id, string name, long? userId);
    Task DeleteBrandAsync(long id, long? userId);
    Task<List<Unit>> GetUnitsAsync();
    Task<Unit> CreateUnitAsync(string code, string name, long? userId);
    Task<Unit?> UpdateUnitAsync(long id, string code, string name, long? userId);
    Task DeleteUnitAsync(long id, long? userId);
    Task<List<ItemCategory>> GetCategoriesAsync();
    Task<ItemCategory> CreateCategoryAsync(string name, long? parentId, long? userId);
    Task<ItemCategory?> UpdateCategoryAsync(long id, UpdateCategoryRequest request, long? userId);
    Task DeleteCategoryAsync(long id, long? userId);
}

public class ItemService : IItemService
{
    private readonly IItemRepository _repository;
    private readonly IAuditService _audit;

    public ItemService(IItemRepository repository, IAuditService audit)
    {
        _repository = repository;
        _audit = audit;
    }

    public Task<List<Item>> GetAllAsync() => _repository.GetAllAsync();
    public Task<Item?> GetAsync(long id) => _repository.GetAsync(id);

    public async Task<Item> CreateAsync(CreateItemRequest request, long? userId)
    {
        var item = await _repository.AddAsync(new Item
        {
            ItemCode = request.ItemCode,
            Name = request.Name,
            Description = request.Description,
            UnitId = request.UnitId,
            BrandId = request.BrandId,
            CategoryId = request.CategoryId,
            UnitPrice = request.UnitPrice,
            ImageUrl = request.ImageUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Item", item.Id);
        return item;
    }

    public async Task<Item?> UpdateAsync(long id, CreateItemRequest request, long? userId)
    {
        var item = await _repository.GetAsync(id);
        if (item == null) return null;
        item.ItemCode = request.ItemCode;
        item.Name = request.Name;
        item.Description = request.Description;
        item.UnitId = request.UnitId;
        item.BrandId = request.BrandId;
        item.CategoryId = request.CategoryId;
        item.UnitPrice = request.UnitPrice;
        item.ImageUrl = request.ImageUrl;
        item.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(item);
        await _audit.LogAsync(userId, "Update", "Item", id);
        return item;
    }

    public async Task DeleteAsync(long id, long? userId)
    {
        await _repository.DeleteAsync(id);
        await _audit.LogAsync(userId, "Delete", "Item", id);
    }

    public Task<List<Brand>> GetBrandsAsync() => _repository.GetBrandsAsync();

    public async Task<Brand> CreateBrandAsync(string name, long? userId)
    {
        var brand = await _repository.AddBrandAsync(new Brand { Name = name, CreatedAt = DateTime.UtcNow });
        await _audit.LogAsync(userId, "Create", "Brand", brand.Id);
        return brand;
    }

    public async Task<Brand?> UpdateBrandAsync(long id, string name, long? userId)
    {
        var brand = await _repository.GetBrandAsync(id);
        if (brand == null) return null;
        brand.Name = name;
        await _repository.UpdateBrandAsync(brand);
        await _audit.LogAsync(userId, "Update", "Brand", id);
        return brand;
    }

    public async Task DeleteBrandAsync(long id, long? userId)
    {
        await _repository.DeleteBrandAsync(id);
        await _audit.LogAsync(userId, "Delete", "Brand", id);
    }

    public Task<List<Unit>> GetUnitsAsync() => _repository.GetUnitsAsync();

    public async Task<Unit> CreateUnitAsync(string code, string name, long? userId)
    {
        var unit = await _repository.AddUnitAsync(new Unit { Code = code, Name = name });
        await _audit.LogAsync(userId, "Create", "Unit", unit.Id);
        return unit;
    }

    public async Task<Unit?> UpdateUnitAsync(long id, string code, string name, long? userId)
    {
        var unit = await _repository.GetUnitAsync(id);
        if (unit == null) return null;
        unit.Code = code;
        unit.Name = name;
        await _repository.UpdateUnitAsync(unit);
        await _audit.LogAsync(userId, "Update", "Unit", id);
        return unit;
    }

    public async Task DeleteUnitAsync(long id, long? userId)
    {
        await _repository.DeleteUnitAsync(id);
        await _audit.LogAsync(userId, "Delete", "Unit", id);
    }

    public Task<List<ItemCategory>> GetCategoriesAsync() => _repository.GetCategoriesAsync();

    public async Task<ItemCategory> CreateCategoryAsync(string name, long? parentId, long? userId)
    {
        var cat = await _repository.AddCategoryAsync(new ItemCategory { Name = name, ParentId = parentId });
        await _audit.LogAsync(userId, "Create", "ItemCategory", cat.Id);
        return cat;
    }

    public async Task<ItemCategory?> UpdateCategoryAsync(long id, UpdateCategoryRequest request, long? userId)
    {
        var cat = await _repository.GetCategoryAsync(id);
        if (cat == null) return null;
        cat.Name = request.Name;
        cat.ParentId = request.ParentId;
        await _repository.UpdateCategoryAsync(cat);
        await _audit.LogAsync(userId, "Update", "ItemCategory", id);
        return cat;
    }

    public async Task DeleteCategoryAsync(long id, long? userId)
    {
        await _repository.DeleteCategoryAsync(id);
        await _audit.LogAsync(userId, "Delete", "ItemCategory", id);
    }
}
