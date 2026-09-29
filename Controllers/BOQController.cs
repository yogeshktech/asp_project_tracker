using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.IO.Compression;
using System.Xml.Linq;
using project_tracker_madhu.BusinessLayer.BoqModule;
using project_tracker_madhu.Common;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/boq")]
public class BOQController : ControllerBase
{
    private readonly IBOQService _boqService;
    private readonly IPermissionService _permissions;
    private readonly IWebHostEnvironment _env;
    public BOQController(IBOQService boqService, IPermissionService permissions, IWebHostEnvironment env)
    {
        _boqService = boqService;
        _permissions = permissions;
        _env = env;
    }
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _boqService.GetByProjectAsync(UserId, projectId));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var boq = await _boqService.GetAsync(id);
        if (boq == null) return NotFound();
        if (!await _permissions.CanViewModuleAsync(UserId, boq.ProjectId, "BOQ")) return Forbid();
        return Ok(boq);
    }

    [HttpPost("{id:long}/versions")]
    public async Task<IActionResult> CreateRevision(long id, [FromBody] CreateBoqRevisionRequest request)
    {
        try { return Ok(await _boqService.CreateRevisionAsync(id, request.Remarks, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:long}/versions/{versionId:long}/baseline")]
    public async Task<IActionResult> SetBaseline(long id, long versionId)
    {
        var version = await _boqService.SetCurrentBaselineAsync(id, versionId, UserId);
        return version == null ? NotFound(new { message = "BOQ version not found." }) : Ok(version);
    }

    [HttpPut("{id:long}/versions/{versionId:long}/items/{itemId:long}")]
    public async Task<IActionResult> UpdateRevisionItem(long id, long versionId, long itemId, [FromBody] UpdateBoqVersionItemRequest request)
    {
        try
        {
            var item = await _boqService.UpdateRevisionItemAsync(id, versionId, itemId, request, UserId);
            return item == null ? NotFound(new { message = "BOQ revision line not found." }) : Ok(item);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] BOQImportDto dto) =>
        Ok(await _boqService.ImportAsync(dto, UserId));

    [HttpPost("import-file")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> ImportFile([FromForm] BOQFileImportRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest(new { message = "A non-empty CSV or XLSX file is required." });
        try
        {
            var lines = await BOQSpreadsheetReader.ReadAsync(request.File);
            var result = await _boqService.ImportAsync(new BOQImportDto
            {
                ProjectId = request.ProjectId,
                Title = string.IsNullOrWhiteSpace(request.Title) ? Path.GetFileNameWithoutExtension(request.File.FileName) : request.Title,
                Commit = request.Commit,
                Lines = lines
            }, UserId);
            return Ok(result);
        }
        catch (InvalidDataException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("from-master")]
    public async Task<IActionResult> FromMaster([FromBody] BoqFromMasterRequest request)
    {
        try { return Ok(await _boqService.CreateFromMasterAsync(request.ProjectId, request.Lines, UserId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("attachments")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public Task<IActionResult> UploadAttachment([FromForm] BOQAttachmentRequest request) =>
        UploadBoqFileAsync(request);

    private async Task<IActionResult> UploadBoqFileAsync(BOQAttachmentRequest request)
    {
        if (request.File == null || request.File.Length == 0) return BadRequest(new { message = "Choose a file to attach." });
        await _permissions.EnsureModuleAsync(UserId, request.ProjectId, "BOQ", "edit");
        var uploads = Path.Combine(_env.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploads);
        var name = Path.GetFileName(request.File.FileName);
        var stored = $"boq_{request.ProjectId}_{Guid.NewGuid():N}";
        var path = Path.Combine(uploads, stored);
        await using (var stream = System.IO.File.Create(path)) await request.File.CopyToAsync(stream);
        return Ok(new { path = $"/boq/projects/{request.ProjectId}/attachments/{stored}", fileName = name });
    }

    [HttpGet("projects/{projectId:long}/attachments/{storedName}")]
    public async Task<IActionResult> DownloadAttachment(long projectId, string storedName)
    {
        var safeName = Path.GetFileName(storedName);
        if (!string.Equals(safeName, storedName, StringComparison.Ordinal)) return BadRequest();
        if (!safeName.StartsWith($"boq_{projectId}_", StringComparison.Ordinal)) return NotFound();
        if (!await _permissions.CanViewModuleAsync(UserId, projectId, "BOQ")) return Forbid();
        var filePath = Path.Combine(_env.ContentRootPath, "uploads", safeName);
        if (!System.IO.File.Exists(filePath)) return NotFound();
        return PhysicalFile(filePath, "application/octet-stream", "boq-attachment", enableRangeProcessing: true);
    }
}

public sealed class BOQFileImportRequest
{
    public long ProjectId { get; set; }
    public string? Title { get; set; }
    public bool Commit { get; set; }
    public IFormFile File { get; set; } = null!;
}

public sealed class BOQAttachmentRequest
{
    public long ProjectId { get; set; }
    public IFormFile File { get; set; } = null!;
}

internal static class BOQSpreadsheetReader
{
    private static readonly string[] CodeHeaders = ["itemcode", "code", "sku", "itemno", "itemnumber", "materialcode", "productcode", "itemid"];
    private static readonly string[] DescriptionHeaders = ["description", "desc", "particulars", "itemdescription", "item", "name", "workdescription", "materialdescription", "scopeofwork"];
    private static readonly string[] QtyHeaders = ["quantity", "qty", "qnty", "nos", "qtynos", "quantitynos", "requiredqty", "boqquantity"];
    private static readonly string[] PriceHeaders = ["unitprice", "price", "rate", "unitrate", "purchaseprice", "basicrate", "estimatedrate", "costperunit"];
    private static readonly string[] TotalHeaders = ["total", "amount", "totalamount", "lineamount", "linetotal", "extendedamount", "totalprice"];
    private static readonly string[] UnitHeaders = ["unit", "uom", "uomunit", "unitofmeasure", "measurementunit"];
    private static readonly string[] BrandHeaders = ["brand", "make", "manufacturer"];
    private static readonly string[] RemarkHeaders = ["remark", "remarks", "notes", "specification", "specifications"];

    public static async Task<List<BOQImportLineDto>> ReadAsync(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        List<List<string>> rows;
        if (ext is ".csv" or ".txt" or ".tsv")
        {
            using var reader = new StreamReader(file.OpenReadStream(), detectEncodingFromByteOrderMarks: true);
            var content = await reader.ReadToEndAsync();
            rows = ParseDelimited(content, ext == ".tsv" ? '\t' : DetectDelimiter(content));
        }
        else if (ext == ".xlsx") rows = ReadXlsx(file);
        else throw new InvalidDataException("Supported formats are .csv, .tsv, .txt, and .xlsx.");

        if (rows.Count < 2) throw new InvalidDataException("The spreadsheet must contain a header row and at least one data row.");
        // Vendor workbooks often put a title, project details, or blank rows above the table.
        // Find the first row that looks like a BOQ header instead of requiring row one.
        var headerRow = -1;
        for (var i = 0; i < Math.Min(rows.Count - 1, 25); i++)
        {
            var candidate = rows[i].Select(Normalize).ToList();
            bool Has(string[] aliases) => candidate.Any(h => aliases.Any(a =>
                string.Equals(h, a, StringComparison.OrdinalIgnoreCase) ||
                (a.Length >= 4 && h.StartsWith(a, StringComparison.OrdinalIgnoreCase))));
            if ((Has(DescriptionHeaders) || Has(CodeHeaders)) && Has(QtyHeaders) && Has(PriceHeaders)) { headerRow = i; break; }
        }
        if (headerRow < 0) headerRow = 0;
        var headers = rows[headerRow].Select(Normalize).ToList();
        int Find(string[] aliases) => headers.FindIndex(h => aliases.Any(a =>
            string.Equals(h, a, StringComparison.OrdinalIgnoreCase) ||
            (a.Length >= 4 && h.StartsWith(a, StringComparison.OrdinalIgnoreCase))));
        var code = Find(CodeHeaders); var description = Find(DescriptionHeaders);
        var qty = Find(QtyHeaders); var price = Find(PriceHeaders); var unit = Find(UnitHeaders);
        var total = Find(TotalHeaders); var brand = Find(BrandHeaders); var remarks = Find(RemarkHeaders);
        if (description < 0 && code < 0) throw new InvalidDataException("Could not identify an item code or description column.");
        if (qty < 0) throw new InvalidDataException("Could not identify a quantity column (for example Qty or Quantity).");
        if (price < 0) throw new InvalidDataException("Could not identify a price column (for example Rate or Unit Price).");
        if (unit < 0) throw new InvalidDataException("Could not identify a unit column (for example Unit or UOM).");

        string Cell(List<string> row, int index) => index >= 0 && index < row.Count ? row[index].Trim() : "";
        var result = new List<BOQImportLineDto>();
        for (var i = headerRow + 1; i < rows.Count; i++)
        {
            var row = rows[i];
            if (row.All(string.IsNullOrWhiteSpace)) continue;
            decimal Number(string value, string field, bool required)
            {
                if (string.IsNullOrWhiteSpace(value))
                {
                    if (required) resultLineErrors.Add($"{field}: is required and must be a valid number.");
                    return 0;
                }
                if (decimal.TryParse(value, NumberStyles.Number | NumberStyles.AllowCurrencySymbol, CultureInfo.InvariantCulture, out var n) ||
                    decimal.TryParse(value, NumberStyles.Number | NumberStyles.AllowCurrencySymbol, CultureInfo.CurrentCulture, out n)) return n;
                resultLineErrors.Add($"{field}: '{value}' is not a valid number.");
                return 0;
            }
            var resultLineErrors = new List<string>();
            var quantity = Number(Cell(row, qty), "Quantity", true);
            var unitPrice = Number(Cell(row, price), "Price", true);
            decimal? totalAmount = null;
            if (total >= 0 && !string.IsNullOrWhiteSpace(Cell(row, total))) totalAmount = Number(Cell(row, total), "Total amount", false);
            result.Add(new BOQImportLineDto
            {
                LineNo = i + 1,
                ItemCode = Empty(Cell(row, code)),
                Description = Empty(Cell(row, description)),
                Quantity = quantity,
                UnitPrice = unitPrice,
                TotalAmount = totalAmount,
                ImportErrors = resultLineErrors,
                Unit = Empty(Cell(row, unit)),
                Brand = Empty(Cell(row, brand)),
                Remarks = Empty(Cell(row, remarks))
            });
        }
        if (result.Count == 0) throw new InvalidDataException("No data rows were found.");
        return result;
    }

    private static string Normalize(string value) => new(value.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());
    private static string? Empty(string value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static char DetectDelimiter(string text)
    {
        var firstLine = text.TrimStart('\uFEFF').Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
        var candidates = new[] { ',', ';', '\t', '|' };
        return candidates.Select(d => (Delimiter: d, Count: CountOutsideQuotes(firstLine, d)))
            .OrderByDescending(x => x.Count).First().Delimiter;
    }

    private static int CountOutsideQuotes(string line, char delimiter)
    {
        var count = 0; var quoted = false;
        for (var i = 0; i < line.Length; i++)
        {
            if (line[i] == '"')
            {
                if (quoted && i + 1 < line.Length && line[i + 1] == '"') i++;
                else quoted = !quoted;
            }
            else if (!quoted && line[i] == delimiter) count++;
        }
        return count;
    }

    private static List<List<string>> ParseDelimited(string text, char delimiter)
    {
        var rows = new List<List<string>>(); var row = new List<string>(); var cell = new System.Text.StringBuilder(); var quoted = false;
        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (c == '"') { if (quoted && i + 1 < text.Length && text[i + 1] == '"') { cell.Append('"'); i++; } else quoted = !quoted; }
            else if (!quoted && c == delimiter) { row.Add(cell.ToString()); cell.Clear(); }
            else if (!quoted && (c == '\r' || c == '\n')) { if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++; row.Add(cell.ToString()); cell.Clear(); rows.Add(row); row = new(); }
            else cell.Append(c);
        }
        if (cell.Length > 0 || row.Count > 0) { row.Add(cell.ToString()); rows.Add(row); }
        return rows;
    }

    private static List<List<string>> ReadXlsx(IFormFile file)
    {
        using var archive = new ZipArchive(file.OpenReadStream(), ZipArchiveMode.Read);
        var shared = new List<string>();
        var sharedEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (sharedEntry != null) { using var s = sharedEntry.Open(); var doc = XDocument.Load(s); shared = doc.Root!.Elements().Select(si => string.Concat(si.Descendants().Where(e => e.Name.LocalName == "t").Select(t => t.Value))).ToList(); }
        var sheet = archive.GetEntry("xl/worksheets/sheet1.xml") ?? throw new InvalidDataException("The workbook has no first worksheet.");
        using var stream = sheet.Open(); var xml = XDocument.Load(stream); var output = new List<List<string>>();
        foreach (var row in xml.Descendants().Where(e => e.Name.LocalName == "row"))
        {
            var values = new SortedDictionary<int, string>();
            foreach (var c in row.Elements().Where(e => e.Name.LocalName == "c"))
            {
                var reference = (string?)c.Attribute("r") ?? "A1"; var col = 0;
                foreach (var ch in reference.TakeWhile(char.IsLetter)) col = col * 26 + char.ToUpperInvariant(ch) - 'A' + 1;
                col--;
                var type = (string?)c.Attribute("t"); var v = c.Elements().FirstOrDefault(e => e.Name.LocalName == "v")?.Value ?? "";
                if (type == "s" && int.TryParse(v, out var si) && si >= 0 && si < shared.Count) v = shared[si];
                else if (type == "inlineStr") v = string.Concat(c.Descendants().Where(e => e.Name.LocalName == "t").Select(t => t.Value));
                values[col] = v;
            }
            var list = new List<string>(); if (values.Count > 0) for (var i = 0; i <= values.Keys.Max(); i++) list.Add(values.GetValueOrDefault(i, ""));
            output.Add(list);
        }
        return output;
    }
}

public class BoqFromMasterRequest
{
    public long ProjectId { get; set; }
    public List<BoqFromMasterLineRequest> Lines { get; set; } = new();
}
