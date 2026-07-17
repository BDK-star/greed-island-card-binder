$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $projectRoot
$englishHtmlPath = Join-Path $projectRoot 'questmora_cards.html'
$fandomImagesPath = Join-Path $workspaceRoot 'Greed_Island_Cards\_sources\fandom_images.json'
$chineseImagesDir = Join-Path $workspaceRoot 'Greed_Island_Cards\02_Chinese'
$outputPath = Join-Path $projectRoot 'app\card-data.json'
$apiCacheDir = Join-Path $projectRoot '.cache\fandom-pages'
New-Item -ItemType Directory -Force -Path $apiCacheDir | Out-Null

function ConvertFrom-HtmlText {
    param([string]$Value)
    $decoded = [System.Net.WebUtility]::HtmlDecode($Value)
    $decoded = $decoded -replace '<[^>]+>', ''
    return ($decoded -replace '\s+', ' ').Trim()
}

function ConvertFrom-WikiText {
    param([string]$Value)
    $text = [System.Net.WebUtility]::HtmlDecode($Value)
    $text = $text -replace '<br\s*/?>', ' '
    $text = $text -replace '\[\[(?:[^\]|]+\|)?([^\]]+)\]\]', '$1'
    $text = $text -replace "'{2,3}", ''
    $text = $text -replace '<[^>]+>', ''
    return ($text -replace '\s+', ' ').Trim()
}

# Parse the 100 specified-slot rows from the English reference table.
$englishHtml = Get-Content -Raw -Encoding UTF8 -LiteralPath $englishHtmlPath
$rowPattern = '<tr id="card-(?<number>\d{3})"[^>]*data-type="Specified Slot Card"[^>]*>(?<body>[\s\S]*?)</tr>'
$englishByNumber = @{}
foreach ($rowMatch in [regex]::Matches($englishHtml, $rowPattern)) {
    $number = $rowMatch.Groups['number'].Value
    $cells = @([regex]::Matches($rowMatch.Groups['body'].Value, '<td[^>]*>(?<cell>[\s\S]*?)</td>') | ForEach-Object { $_.Groups['cell'].Value })
    if ($cells.Count -lt 7) { continue }
    $englishByNumber[$number] = [ordered]@{
        name = ConvertFrom-HtmlText $cells[2]
        effect = ConvertFrom-HtmlText $cells[6]
        rank = ConvertFrom-HtmlText $cells[4]
        limit = ConvertFrom-HtmlText $cells[5]
    }
}
if ($englishByNumber.Count -ne 100) {
    throw "Expected 100 English rows, found $($englishByNumber.Count)"
}

# Build the canonical Hunterpedia page sequence from the 100 Japanese card scans.
$fandomImages = (Get-Content -Raw -Encoding UTF8 -LiteralPath $fandomImagesPath | ConvertFrom-Json).parse.images
$scanImages = @($fandomImages | Where-Object { $_ -like '*G.I_card*scan*' })
$athlete = @($fandomImages | Where-Object { $_ -eq 'Fledgling_Athlete_(G.I_card).png' })
$imageSequence = @($scanImages[0..36]) + @($athlete[0]) + @($scanImages[37..98])
$pageTitles = @($imageSequence | ForEach-Object {
    ($_ -replace '_=scan=\.png$', '' -replace '\.png$', '' -replace '_', ' ')
})

$japaneseByNumber = @{}
for ($offset = 0; $offset -lt 100; $offset += 25) {
    $last = [Math]::Min($offset + 24, 99)
    $titles = [uri]::EscapeDataString((@($pageTitles[$offset..$last]) -join '|'))
    $url = "https://hunterxhunter.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=$titles&format=json&formatversion=2"
    $cacheFile = Join-Path $apiCacheDir ("pages_{0:D3}.json" -f $offset)
    if (-not (Test-Path -LiteralPath $cacheFile)) {
        & curl.exe -L --fail --silent --show-error --retry 3 -A 'Mozilla/5.0' $url -o $cacheFile
        if ($LASTEXITCODE -ne 0) { throw "Failed to fetch Japanese card pages at offset $offset" }
    }
    $response = Get-Content -Raw -Encoding UTF8 -LiteralPath $cacheFile | ConvertFrom-Json
    foreach ($page in @($response.query.pages)) {
        if (-not $page.revisions) { continue }
        $wiki = $page.revisions[0].slots.main.content
        $numberMatch = [regex]::Match($wiki, '\|\s*Number\s*=\s*#(?<number>\d{3})')
        if (-not $numberMatch.Success) { continue }
        $number = $numberMatch.Groups['number'].Value
        $nameMatch = [regex]::Match($wiki, '\|\s*Name2\s*=\s*(?<name>.*?)<br')
        $descriptionPattern = "!\[Jap\]\s*\|\s*'''No\.\d{3}'''\s*::\s*'''.*?'''<br\s*/?>\s*(?<effect>[\s\S]*?)\n\|-"
        $effectMatch = [regex]::Match($wiki, $descriptionPattern)
        $japaneseByNumber[$number] = [ordered]@{
            name = $(if ($nameMatch.Success) { ConvertFrom-WikiText $nameMatch.Groups['name'].Value } else { $englishByNumber[$number].name })
            effect = $(if ($effectMatch.Success) { ConvertFrom-WikiText $effectMatch.Groups['effect'].Value } else { $englishByNumber[$number].effect })
        }
    }
}

# Use the installed Windows Chinese OCR language pack to index the translated card images.
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod } | Select-Object -First 1)
function Await-WinRt {
    param($Operation, [Type]$ResultType)
    $method = $asTaskGeneric.MakeGenericMethod($ResultType)
    $task = $method.Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('zh-Hans-CN'))
$chineseByNumber = @{}
for ($i = 0; $i -lt 100; $i++) {
    $number = '{0:D3}' -f $i
    $path = Join-Path $chineseImagesDir "$number.jpg"
    $file = Await-WinRt ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
    $stream = Await-WinRt ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-WinRt ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-WinRt ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await-WinRt ($ocrEngine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $lines = @($result.Lines | ForEach-Object { ($_.Text -replace '\s+', '') })
    # Keep this regex ASCII-only so Windows PowerShell 5 parses the script
    # correctly even when it does not infer UTF-8 for a BOM-less .ps1 file.
    $rankPattern = '(SS|S|A|B|C|D|E|F|G|H).?\d+'
    $rankIndex = -1
    for ($lineIndex = 0; $lineIndex -lt $lines.Count; $lineIndex++) {
        if ($lines[$lineIndex] -match $rankPattern) { $rankIndex = $lineIndex; break }
    }
    $name = $englishByNumber[$number].name
    if ($rankIndex -ge 0) {
        $prefix = ($lines[$rankIndex] -replace "$rankPattern.*$", '')
        if ($prefix -and $prefix -notmatch '^\d+$') {
            $name = $prefix
        }
        else {
            for ($candidate = $rankIndex - 1; $candidate -ge 0; $candidate--) {
                if ($lines[$candidate] -and $lines[$candidate] -notmatch '^\d+$') {
                    $name = $lines[$candidate]
                    break
                }
            }
        }
    }
    $effectLines = @()
    if ($rankIndex -ge 0 -and $rankIndex + 1 -lt $lines.Count) {
        $effectLines = @($lines[($rankIndex + 1)..($lines.Count - 1)] | Where-Object {
            $_ -and $_ -notmatch '^\d+$' -and $_ -notmatch 'POT|P0T|P019|NOT|SALE|SALI|V.N|N.S|@V|1998|98.11'
        })
    }
    $effect = ($effectLines -join '')
    $chineseByNumber[$number] = [ordered]@{
        name = $name
        effect = $effect
    }
    $bitmap.Dispose()
    $stream.Dispose()
}

$overridePath = Join-Path $PSScriptRoot 'chinese-overrides.json'
$chineseOverrides = Get-Content -Raw -Encoding UTF8 -LiteralPath $overridePath | ConvertFrom-Json
foreach ($property in $chineseOverrides.PSObject.Properties) {
    $number = $property.Name
    $override = $property.Value
    $correctName = [string]$override.name
    if ($correctName) {
        $chineseByNumber[$number].name = $correctName
        if ($chineseByNumber[$number].effect.StartsWith($correctName)) {
            $chineseByNumber[$number].effect = $chineseByNumber[$number].effect.Substring($correctName.Length)
        }
    }
    if ($override.effect) {
        $chineseByNumber[$number].effect = [string]$override.effect
    }
}

$cards = for ($i = 0; $i -lt 100; $i++) {
    $number = '{0:D3}' -f $i
    [ordered]@{
        number = $number
        rank = $englishByNumber[$number].rank
        limit = $englishByNumber[$number].limit
        zh = $chineseByNumber[$number]
        ja = $(if ($japaneseByNumber.ContainsKey($number)) { $japaneseByNumber[$number] } else { [ordered]@{ name = $englishByNumber[$number].name; effect = $englishByNumber[$number].effect } })
        en = [ordered]@{
            name = $englishByNumber[$number].name
            effect = $englishByNumber[$number].effect
        }
    }
}

$json = $cards | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText($outputPath, $json, (New-Object Text.UTF8Encoding($false)))
Write-Output "Generated $($cards.Count) multilingual card records at $outputPath"
