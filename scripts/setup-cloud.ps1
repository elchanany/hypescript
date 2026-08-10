[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
  [string]$GoogleProjectId,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^https://')]
  [string]$SiteUrl,

  [string]$Region = 'me-west1',
  [switch]$SyncVercel
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot 'web\.env.local'
$workerPath = Join-Path $repoRoot 'cloud-render-worker'

function Read-PlainSecret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function New-Token {
  return [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
}

function Get-DotEnv([string]$Name) {
  if (-not (Test-Path -LiteralPath $envPath)) { return '' }
  $line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match ('^' + [Regex]::Escape($Name) + '=') } | Select-Object -Last 1
  if (-not $line) { return '' }
  return ($line -replace ('^' + [Regex]::Escape($Name) + '='), '').Trim()
}

function Set-DotEnv([string]$Name, [string]$Value) {
  $lines = if (Test-Path -LiteralPath $envPath) { [Collections.Generic.List[string]](Get-Content -LiteralPath $envPath) } else { [Collections.Generic.List[string]]::new() }
  $prefix = "$Name="
  $found = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index].StartsWith($prefix, [StringComparison]::Ordinal)) {
      $lines[$index] = "$prefix$Value"
      $found = $true
    }
  }
  if (-not $found) { $lines.Add("$prefix$Value") }
  [IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))
}

function Require-Value([string]$Name, [string]$Prompt, [switch]$Secret) {
  $value = Get-DotEnv $Name
  if ($value) { return $value }
  $value = if ($Secret) { Read-PlainSecret $Prompt } else { (Read-Host $Prompt).Trim() }
  if (-not $value) { throw "חסר ערך עבור $Name" }
  Set-DotEnv $Name $value
  return $value
}

function Set-GoogleSecret([string]$SecretName, [string]$Value) {
  & gcloud secrets describe $SecretName --project $GoogleProjectId --format='value(name)' 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    & gcloud secrets create $SecretName --project $GoogleProjectId --replication-policy=automatic | Out-Null
  }
  $tempPath = Join-Path ([IO.Path]::GetTempPath()) ("hypescript-" + [Guid]::NewGuid().ToString('N') + '.secret')
  try {
    [IO.File]::WriteAllText($tempPath, $Value, [Text.UTF8Encoding]::new($false))
    & gcloud secrets versions add $SecretName --project $GoogleProjectId --data-file=$tempPath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "יצירת Secret נכשלה: $SecretName" }
  } finally {
    if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force }
  }
}

function Add-VercelValue([string]$Name, [string]$Value, [bool]$Sensitive) {
  foreach ($target in @('production', 'preview', 'development')) {
    $arguments = @('env', 'add', $Name, $target)
    if ($Sensitive) { $arguments += '--sensitive' }
    $Value | & vercel @arguments
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "$Name כבר קיים או לא נוסף ל-$target. עדכן אותו ידנית ב-Vercel אם צריך."
    }
  }
}

foreach ($command in @('gcloud')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "הפקודה $command לא מותקנת." }
}

$supabaseUrl = Require-Value 'NEXT_PUBLIC_SUPABASE_URL' 'Supabase Project URL'
$supabaseAnon = Require-Value 'NEXT_PUBLIC_SUPABASE_ANON_KEY' 'Supabase Publishable key' -Secret
$supabaseSecret = Require-Value 'SUPABASE_SERVICE_ROLE_KEY' 'Supabase Secret/service_role key' -Secret
$r2Account = Require-Value 'R2_ACCOUNT_ID' 'Cloudflare Account ID'
$r2Bucket = Require-Value 'R2_BUCKET' 'R2 bucket name (מומלץ hypescript-media)'
$r2Access = Require-Value 'R2_ACCESS_KEY_ID' 'R2 Access Key ID' -Secret
$r2Secret = Require-Value 'R2_SECRET_ACCESS_KEY' 'R2 Secret Access Key' -Secret
$renderToken = Get-DotEnv 'CLOUD_RENDER_TOKEN'
if (-not $renderToken) { $renderToken = New-Token; Set-DotEnv 'CLOUD_RENDER_TOKEN' $renderToken }
$callbackSecret = Get-DotEnv 'CLOUD_RENDER_CALLBACK_SECRET'
if (-not $callbackSecret) { $callbackSecret = New-Token; Set-DotEnv 'CLOUD_RENDER_CALLBACK_SECRET' $callbackSecret }
$normalizedSite = $SiteUrl.TrimEnd('/')
Set-DotEnv 'NEXT_PUBLIC_SITE_URL' $normalizedSite

Write-Host 'מפעיל APIs ומכין Service Account...' -ForegroundColor Cyan
& gcloud config set project $GoogleProjectId | Out-Null
& gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project $GoogleProjectId
$serviceAccountName = 'hypescript-render'
$serviceAccountEmail = "$serviceAccountName@$GoogleProjectId.iam.gserviceaccount.com"
& gcloud iam service-accounts describe $serviceAccountEmail --project $GoogleProjectId --format='value(email)' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  & gcloud iam service-accounts create $serviceAccountName --project $GoogleProjectId --display-name='Hypescript render worker' | Out-Null
}
& gcloud projects add-iam-policy-binding $GoogleProjectId --member="serviceAccount:$serviceAccountEmail" --role='roles/secretmanager.secretAccessor' --condition=None | Out-Null

Set-GoogleSecret 'hypescript-r2-access-key' $r2Access
Set-GoogleSecret 'hypescript-r2-secret-key' $r2Secret
Set-GoogleSecret 'hypescript-render-token' $renderToken
Set-GoogleSecret 'hypescript-callback-secret' $callbackSecret

Write-Host 'פורס את FFmpeg worker ל-Cloud Run...' -ForegroundColor Cyan
& gcloud run deploy hypescript-render `
  --source $workerPath `
  --project $GoogleProjectId `
  --region $Region `
  --allow-unauthenticated `
  --service-account $serviceAccountEmail `
  --cpu 2 `
  --memory 4Gi `
  --timeout 3600 `
  --concurrency 1 `
  --max-instances 3 `
  --set-env-vars="R2_ACCOUNT_ID=$r2Account,R2_BUCKET=$r2Bucket" `
  --set-secrets='R2_ACCESS_KEY_ID=hypescript-r2-access-key:latest,R2_SECRET_ACCESS_KEY=hypescript-r2-secret-key:latest,CLOUD_RENDER_TOKEN=hypescript-render-token:latest,CLOUD_RENDER_CALLBACK_SECRET=hypescript-callback-secret:latest'
if ($LASTEXITCODE -ne 0) { throw 'פריסת Cloud Run נכשלה.' }

$renderUrl = (& gcloud run services describe hypescript-render --project $GoogleProjectId --region $Region --format='value(status.url)').Trim()
if (-not $renderUrl) { throw 'Cloud Run לא החזיר URL.' }
Set-DotEnv 'CLOUD_RENDER_URL' $renderUrl

if ($SyncVercel) {
  if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { throw 'Vercel CLI לא מותקן.' }
  Push-Location (Join-Path $repoRoot 'web')
  try {
    if (-not (Test-Path -LiteralPath '.vercel\project.json')) { & vercel link }
    $values = [ordered]@{
      NEXT_PUBLIC_SITE_URL = $normalizedSite
      NEXT_PUBLIC_SUPABASE_URL = $supabaseUrl
      NEXT_PUBLIC_SUPABASE_ANON_KEY = $supabaseAnon
      SUPABASE_SERVICE_ROLE_KEY = $supabaseSecret
      R2_ACCOUNT_ID = $r2Account
      R2_BUCKET = $r2Bucket
      R2_ACCESS_KEY_ID = $r2Access
      R2_SECRET_ACCESS_KEY = $r2Secret
      CLOUD_RENDER_URL = $renderUrl
      CLOUD_RENDER_TOKEN = $renderToken
      CLOUD_RENDER_CALLBACK_SECRET = $callbackSecret
    }
    $publicNames = @('NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET', 'CLOUD_RENDER_URL')
    foreach ($entry in $values.GetEnumerator()) { Add-VercelValue $entry.Key $entry.Value (-not ($publicNames -contains $entry.Key)) }
  } finally { Pop-Location }
}

Write-Host "הענן מוכן. Cloud Run: $renderUrl" -ForegroundColor Green
Write-Host "בדיקה: Invoke-RestMethod '$renderUrl/health'"
Write-Host 'כעת בצע Redeploy ב-Vercel אם השתמשת ב-SyncVercel.'
