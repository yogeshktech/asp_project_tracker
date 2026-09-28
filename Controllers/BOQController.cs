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
    public BOQController(IBOQService boqService) => _boqService = boqService;
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _boqService.GetByProjectAsync(UserId, projectId));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var boq = await _boqService.GetAsync(id);
        return boq == null ? NotFound() : Ok(boq);
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
    public async Task<IActionResult> FromMaster([FromBody] BoqFromMasterRequest request) =>
        Ok(await _boqService.CreateFromMasterAsync(request.ProjectId, request.ItemIds, UserId));
}

public sealed class BOQFileImportRequest
{
    public long ProjectId { get; set; }
    public string? Title { get; set; }
    public bool Commit { get; set; }
    public IFormFile File { get; set; } = null!;
}

internal static class BOQSpreadsheetReader
{
    private static readonly string[] CodeHeaders = ["itemcode", "code", "sku", "itemno", "itemnumber"];
    private static readonly string[] DescriptionHeaders = ["description", "desc", "particulars", "itemdescription", "item", "name"];
    private static readonly string[] QtyHeaders = ["quantity", "qty", "qnty", "nos"];
    private static readonly string[] PriceHeaders = ["unitprice", "price", "rate", "unitrate", "purchaseprice"];
    private static readonly string[] UnitHeaders = ["unit", "uom", "uomunit"];
    private static readonly string[] BrandHeaders = ["brand", "make", "manufacturer"];
    private static readonly string[] RemarkHeaders = ["remark", "remarks", "notes"];

    public static async Task<List<BOQImportLineDto>> ReadAsync(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        List<List<string>> rows;
        if (ext is ".csv" or ".txt" or ".tsv")
        {
            using var reader = new StreamReader(file.OpenReadStream());
            rows = ParseDelimited(await reader.ReadToEndAsync(), ext == ".tsv" ? '\t' : ',');
        }
        else if (ext == ".xlsx") rows = ReadXlsx(file);
        else throw new InvalidDataException("Supported formats are .csv, .tsv, .txt, and .xlsx.");

        if (rows.Count < 2) throw new InvalidDataException("The spreadsheet must contain a header row and at least one data row.");
        var headers = rows[0].Select(Normalize).ToList();
        int Find(string[] aliases) => headers.FindIndex(h => aliases.Contains(h, StringComparer.OrdinalIgnoreCase));
        var code = Find(CodeHeaders); var description = Find(DescriptionHeaders);
        var qty = Find(QtyHeaders); var price = Find(PriceHeaders); var unit = Find(UnitHeaders);
        var brand = Find(BrandHeaders); var remarks = Find(RemarkHeaders);
        if (description < 0 && code < 0) throw new InvalidDataException("Could not identify an item code or description column.");
        if (qty < 0) throw new InvalidDataException("Could not identify a quantity column (for example Qty or Quantity).");
        if (price < 0) throw new InvalidDataException("Could not identify a price column (for example Rate or Unit Price).");

        string Cell(List<string> row, int index) => index >= 0 && index < row.Count ? row[index].Trim() : "";
        var result = new List<BOQImportLineDto>();
        for (var i = 1; i < rows.Count; i++)
        {
            var row = rows[i];
            if (row.All(string.IsNullOrWhiteSpace)) continue;
            decimal Number(string value) => decimal.TryParse(value, NumberStyles.Number | NumberStyles.AllowCurrencySymbol, CultureInfo.InvariantCulture, out var n)
                ? n : decimal.TryParse(value, NumberStyles.Number | NumberStyles.AllowCurrencySymbol, CultureInfo.CurrentCulture, out n) ? n : 0;
            result.Add(new BOQImportLineDto
            {
                LineNo = i,
                ItemCode = Empty(Cell(row, code)),
                Description = Empty(Cell(row, description)),
                Quantity = Number(Cell(row, qty)),
                UnitPrice = Number(Cell(row, price)),
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
    public List<long> ItemIds { get; set; } = new();
}
