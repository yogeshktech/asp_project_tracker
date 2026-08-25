using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.BusinessLayer.Items;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/items")]
public class ItemsController : ControllerBase
{
    private readonly IItemService _itemService;
    public ItemsController(IItemService itemService) => _itemService = itemService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _itemService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var item = await _itemService.GetAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateItemRequest request) =>
        Ok(await _itemService.CreateAsync(request, UserId));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateItemRequest request)
    {
        var item = await _itemService.UpdateAsync(id, request, UserId);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        await _itemService.DeleteAsync(id, UserId);
        return NoContent();
    }

    [HttpGet("brands")]
    public async Task<IActionResult> Brands() => Ok(await _itemService.GetBrandsAsync());

    [HttpPost("brands")]
    public async Task<IActionResult> CreateBrand([FromBody] NameRequest request) =>
        Ok(await _itemService.CreateBrandAsync(request.Name, UserId));

    [HttpPut("brands/{id:long}")]
    public async Task<IActionResult> UpdateBrand(long id, [FromBody] NameRequest request)
    {
        var brand = await _itemService.UpdateBrandAsync(id, request.Name, UserId);
        return brand == null ? NotFound() : Ok(brand);
    }

    [HttpDelete("brands/{id:long}")]
    public async Task<IActionResult> DeleteBrand(long id)
    {
        await _itemService.DeleteBrandAsync(id, UserId);
        return NoContent();
    }

    [HttpGet("units")]
    public async Task<IActionResult> Units() => Ok(await _itemService.GetUnitsAsync());

    [HttpPost("units")]
    public async Task<IActionResult> CreateUnit([FromBody] UnitRequest request) =>
        Ok(await _itemService.CreateUnitAsync(request.Code, request.Name, UserId));

    [HttpPut("units/{id:long}")]
    public async Task<IActionResult> UpdateUnit(long id, [FromBody] UnitRequest request)
    {
        var unit = await _itemService.UpdateUnitAsync(id, request.Code, request.Name, UserId);
        return unit == null ? NotFound() : Ok(unit);
    }

    [HttpDelete("units/{id:long}")]
    public async Task<IActionResult> DeleteUnit(long id)
    {
        await _itemService.DeleteUnitAsync(id, UserId);
        return NoContent();
    }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories() => Ok(await _itemService.GetCategoriesAsync());

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryRequest request) =>
        Ok(await _itemService.CreateCategoryAsync(request.Name, request.ParentId, UserId));

    [HttpPut("categories/{id:long}")]
    public async Task<IActionResult> UpdateCategory(long id, [FromBody] UpdateCategoryRequest request)
    {
        var cat = await _itemService.UpdateCategoryAsync(id, request, UserId);
        return cat == null ? NotFound() : Ok(cat);
    }

    [HttpDelete("categories/{id:long}")]
    public async Task<IActionResult> DeleteCategory(long id)
    {
        await _itemService.DeleteCategoryAsync(id, UserId);
        return NoContent();
    }
}

public class NameRequest { public string Name { get; set; } = string.Empty; }
public class CategoryRequest { public string Name { get; set; } = string.Empty; public long? ParentId { get; set; } }
public class UnitRequest { public string Code { get; set; } = string.Empty; public string Name { get; set; } = string.Empty; }
