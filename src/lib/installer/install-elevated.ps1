$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DataDir = Join-Path $Root "data"
$WorkDir = Join-Path $DataDir "work"
$OrdersLog = Join-Path $DataDir "logs\installation-orders.log"

$RequestPath = Join-Path $WorkDir "elevated-install-request.json"
$ResultPath = Join-Path $WorkDir "elevated-install-result.json"

$trustedHashes = @{
    "node" = "bb0eaee134f9357f22aea915ee793343e627aefc1e66488164bac6915bce2cac"
    "git"  = "bfe94e7b419b16eee9fecbd1253a98e3d4f49ba8f029630549052278ffe286a6"
}

function Write-Result($result) {
    $json = $result | ConvertTo-Json -Depth 10
    $tmp = "$ResultPath.tmp"

    [System.IO.File]::WriteAllText(
        $tmp,
        $json,
        [System.Text.UTF8Encoding]::new($false)
    )

    Move-Item -LiteralPath $tmp -Destination $ResultPath -Force
}

function Write-Audit($orderId, $status, $extra = @{}) {
    $entry = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        orderId = $orderId
        status = $status
        elevatedProcess = $true
    }

    foreach ($key in $extra.Keys) {
        $entry[$key] = $extra[$key]
    }

    $line = $entry | ConvertTo-Json -Compress
    Add-Content -LiteralPath $OrdersLog -Value $line -Encoding UTF8
}

try {
    # --------------------------------------------------------
    # Confirmar que realmente somos administrador
    # --------------------------------------------------------

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)

    $isAdmin = $principal.IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )

    if (-not $isAdmin) {
        throw "El proceso elevado no tiene privilegios de administrador."
    }

    # --------------------------------------------------------
    # Leer solicitud
    # --------------------------------------------------------

    if (-not (Test-Path -LiteralPath $RequestPath)) {
        throw "No existe la solicitud de instalación elevada."
    }

    $request = Get-Content -LiteralPath $RequestPath -Raw |
        ConvertFrom-Json

    $orderId = [string]$request.orderId

    if ([string]::IsNullOrWhiteSpace($orderId)) {
        throw "La solicitud no contiene orderId."
    }

    # --------------------------------------------------------
    # Buscar orden exacta
    # --------------------------------------------------------

    if (-not (Test-Path -LiteralPath $OrdersLog)) {
        throw "No existe el registro de órdenes."
    }

    $orders = @(
        Get-Content -LiteralPath $OrdersLog -Encoding UTF8 |
        ForEach-Object {
            try {
                $_ | ConvertFrom-Json
            }
            catch {}
        }
    )

    $order = $orders |
        Where-Object { $_.orderId -eq $orderId } |
        Select-Object -Last 1

    if ($null -eq $order) {
        throw "No se encontró la orden autorizada."
    }

    if ($order.status -ne "awaiting-confirmation") {
        throw "La orden no está esperando confirmación."
    }

    if ($order.verified -ne $true) {
        throw "La orden no está verificada."
    }

    if ($order.executionAllowed -ne $false) {
        throw "La orden tiene un estado de ejecución no permitido."
    }

    if ($order.requiresAdministrator -ne $true) {
        throw "La orden no requiere elevación administrativa."
    }

    # --------------------------------------------------------
    # Lista cerrada de componentes permitidos
    # --------------------------------------------------------

    $componentId = [string]$order.componentId

    if (-not $trustedHashes.ContainsKey($componentId)) {
        throw "El componente no está permitido por el ejecutor elevado."
    }

    $installerPath = [string]$order.installerPath

    if ([string]::IsNullOrWhiteSpace($installerPath)) {
        throw "La orden no contiene ruta de instalador."
    }

    if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
        throw "El instalador autorizado no existe."
    }

    # --------------------------------------------------------
    # El ejecutor elevado vuelve a comprobar SHA-256
    # --------------------------------------------------------

    $actualHash = (
        Get-FileHash -LiteralPath $installerPath -Algorithm SHA256
    ).Hash.ToLowerInvariant()

    $expectedHash = $trustedHashes[$componentId].ToLowerInvariant()

    if ($actualHash -ne $expectedHash) {
        throw "SHA-256 incorrecto. Instalación bloqueada."
    }

    # --------------------------------------------------------
    # Registrar inicio
    # --------------------------------------------------------

    Write-Audit $orderId "elevated-validation-passed" @{
        componentId = $componentId
        installerPath = $installerPath
        sha256 = $actualHash
    }

    # --------------------------------------------------------
    # BARRERA DRY-RUN
    #
    # Si la solicitud es de prueba, NO se ejecuta msiexec.
    # Se valida todo el flujo hasta el punto inmediatamente
    # anterior a la instalación real.
    # --------------------------------------------------------

    if ($request.dryRun -eq $true) {

        Write-Audit $orderId "dry-run-ready" @{
            componentId = $componentId
            installerPath = $installerPath
            sha256 = $actualHash
        }

        Write-Result @{
            success = $true
            dryRun = $true
            elevated = $true
            orderId = $orderId
            componentId = $componentId
            installerPath = $installerPath
            sha256 = $actualHash
            readyForInstallation = $true
            installerExecuted = $false
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
        }

        exit 0
    }

    # --------------------------------------------------------
    # EJECUCIÓN REAL
    #
    # Solo MSI.
    # Solo Node/Git previamente autorizados.
    # Sin shell.
    # --------------------------------------------------------

    if ([System.IO.Path]::GetExtension($installerPath).ToLowerInvariant() -ne ".msi") {
        throw "El ejecutor elevado solo permite instaladores MSI."
    }

    $process = Start-Process `
        -FilePath "msiexec.exe" `
        -ArgumentList @("/i", $installerPath) `
        -Wait `
        -PassThru `
        -WindowStyle Normal

    $exitCode = $process.ExitCode

    if ($exitCode -eq 0) {
        Write-Audit $orderId "completed" @{
            componentId = $componentId
            exitCode = $exitCode
        }

        Write-Result @{
            success = $true
            elevated = $true
            orderId = $orderId
            componentId = $componentId
            exitCode = $exitCode
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
        }

        exit 0
    }

    Write-Audit $orderId "failed" @{
        componentId = $componentId
        exitCode = $exitCode
    }

    Write-Result @{
        success = $false
        elevated = $true
        orderId = $orderId
        componentId = $componentId
        exitCode = $exitCode
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        error = "El instalador terminó con código $exitCode."
    }

    exit $exitCode
}
catch {
    $message = $_.Exception.Message

    try {
        Write-Audit $orderId "blocked" @{
            error = $message
        }
    }
    catch {}

    Write-Result @{
        success = $false
        elevated = $isAdmin
        orderId = $orderId
        error = $message
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    }

    exit 1
}

