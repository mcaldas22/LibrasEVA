Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root "videos para adicionar"
$outFile = Join-Path $root "data\local_catalog.json"

if (!(Test-Path $srcDir)) {
  throw "Pasta nao encontrada: $srcDir"
}

function Convert-ToSlug([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return "" }
  $norm = $text.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $norm.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($c)
    }
  }
  $clean = $sb.ToString().ToLowerInvariant()
  $clean = [regex]::Replace($clean, "[^a-z0-9]+", "-")
  return $clean.Trim("-")
}

function New-ShortExplanation([string]$term, [string]$discipline) {
  return @(
    "$term e um conceito importante em $discipline dentro das ciencias.",
    "Esse termo ajuda a entender fenomenos e processos de forma objetiva."
  ) -join " "
}

function Normalize-DisciplineName([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return $name }
  $n = $name -replace "-\d{8}T\d+Z-\d+-\d+$", ""
  return $n.Trim()
}

$videoExt = @(".mp4", ".webm", ".mov", ".mkv", ".avi")
$videos = Get-ChildItem -Path $srcDir -Recurse -File |
  Where-Object { $videoExt -contains $_.Extension.ToLowerInvariant() }

$disciplineMap = @{}
$termMap = @{}

foreach ($v in $videos) {
  $relative = $v.FullName.Substring($root.Length + 1).Replace("\", "/")

  # Caminho esperado: videos para adicionar/<disciplina>/<termo>/<arquivo>
  # Fallback: videos para adicionar/<disciplina>/<arquivo>
  $parts = $relative.Split("/")
  if ($parts.Length -lt 3) { continue }

  # indice 0="videos para adicionar"
  # indices finais variam conforme estrutura; usamos os dois diretorios acima do video.
  $dirAboveVideo = $parts[$parts.Length - 2]
  $dirTwoAbove   = $parts[$parts.Length - 3]

  $fileBase = [IO.Path]::GetFileNameWithoutExtension($v.Name)
  $term = $fileBase
  $discipline = $dirTwoAbove

  # Estrutura esperada: disciplina/termo/video.ext
  # Quando existir pasta de termo, prioriza o nome da pasta.
  $isTechnicalTwoAbove = ($dirTwoAbove -match "^_" -or $dirTwoAbove -match "-\d{8}T\d+Z-\d+-\d+$" -or $dirTwoAbove -match "^[A-Za-z0-9\-]+T[0-9]+Z")
  if (-not $isTechnicalTwoAbove -and $dirAboveVideo -ne $dirTwoAbove) {
    $term = $dirAboveVideo
  }

  # Se arquivo for "video.*", reforca uso da pasta pai como termo.
  if ($fileBase.ToLowerInvariant() -eq "video") {
    $term = $dirAboveVideo
  }

  # Ignorar pastas tecnicas.
  if ($discipline -match "^_" -or $discipline -match "-\d{8}T\d+Z-\d+-\d+$" -or $discipline -match "^[A-Za-z0-9\-]+T[0-9]+Z") {
    # Tenta usar pasta imediatamente acima como disciplina quando veio de zip extraido.
    $discipline = $dirAboveVideo
  }

  $discipline = Normalize-DisciplineName $discipline

  if ([string]::IsNullOrWhiteSpace($discipline) -or [string]::IsNullOrWhiteSpace($term)) { continue }

  $disciplineId = Convert-ToSlug $discipline
  $termId = Convert-ToSlug ($discipline + "-" + $term)

  if (!$disciplineMap.ContainsKey($disciplineId)) {
    $disciplineMap[$disciplineId] = [PSCustomObject]@{
      id = $disciplineId
      nome = $discipline
    }
  }

  # Um termo exclusivo por disciplina + termo, atualiza para o arquivo mais recente.
  $key = "$disciplineId|$(Convert-ToSlug $term)"
  $item = [PSCustomObject]@{
    id = $termId
    termo = $term
    disciplinaId = $disciplineId
    disciplinaNome = $discipline
    videoPath = $relative
    explicacao = New-ShortExplanation $term $discipline
  }

  if ($termMap.ContainsKey($key)) {
    $old = $termMap[$key]
    $oldAbs = Join-Path $root ($old.videoPath.Replace("/", "\"))
    if ((Get-Item $v.FullName).LastWriteTimeUtc -gt (Get-Item $oldAbs).LastWriteTimeUtc) {
      $termMap[$key] = $item
    }
  } else {
    $termMap[$key] = $item
  }
}

$disciplinas = @($disciplineMap.Values | Sort-Object nome)
$termos = @($termMap.Values | Sort-Object disciplinaNome, termo)

$payload = [PSCustomObject]@{
  generatedAt = [DateTime]::UtcNow.ToString("o")
  sourceFolder = "videos para adicionar"
  disciplinas = $disciplinas
  termos = $termos
}

$payload | ConvertTo-Json -Depth 6 | Set-Content -Path $outFile -Encoding UTF8
Write-Host "Gerado: $outFile"
Write-Host "Disciplinas: $($disciplinas.Count)"
Write-Host "Termos: $($termos.Count)"