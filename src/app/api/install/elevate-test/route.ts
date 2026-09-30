import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

const ROOT = process.cwd();
const WORK_DIR = path.join(ROOT, "data", "work");
const HELPER_PATH = path.join(WORK_DIR, "elevation-test.ps1");
const RESULT_PATH = path.join(WORK_DIR, "elevation-test-result.json");

function runElevated(helperPath: string): Promise<{
  success: boolean;
  exitCode: number | null;
  error?: string;
}> {
  return new Promise((resolve) => {
    const escapedPath = helperPath.replace(/'/g, "''");

    const command = `
$p = Start-Process powershell.exe `
      + `-Verb RunAs `
      + `-Wait `
      + `-ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','${escapedPath}') `
      + `-PassThru
if ($null -eq $p) {
    exit 1
}
exit $p.ExitCode
`;

    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        command,
      ],
      {
        windowsHide: false,
        shell: false,
      }
    );

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        exitCode: null,
        error: error.message,
      });
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        exitCode: code,
        error: stderr.trim() || undefined,
      });
    });
  });
}

export async function POST() {
  try {
    await fs.mkdir(WORK_DIR, { recursive: true });

    const resultPathForPowerShell =
      RESULT_PATH.replace(/\\/g, "\\\\");

    const helper = `
$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)

$isAdmin = $principal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

$result = @{
    success = $true
    elevated = $isAdmin
    user = $identity.Name
    processId = $PID
    checkedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$resultPath = "${resultPathForPowerShell}"

$result |
    ConvertTo-Json -Depth 5 |
    Set-Content -Path $resultPath -Encoding UTF8

if (-not $isAdmin) {
    exit 2
}

exit 0
`;

    await fs.writeFile(HELPER_PATH, helper, "utf8");
    await fs.rm(RESULT_PATH, { force: true });

    const result = await runElevated(HELPER_PATH);

    let elevationResult: { elevated?: boolean; success?: boolean; user?: string; processId?: number; checkedAt?: string } | null = null;

    try {
      elevationResult = JSON.parse(
        await fs.readFile(RESULT_PATH, "utf8")
      );
    } catch {
      elevationResult = null;
    }

    if (!result.success || !elevationResult) {
      return NextResponse.json(
        {
          success: false,
          elevationRequested: true,
          elevated: false,
          exitCode: result.exitCode,
          error:
            result.error ||
            "La elevación no produjo un resultado verificable. Es posible que UAC haya sido cancelado.",
        },
        { status: 403 }
      );
    }

    if (elevationResult.elevated !== true) {
      return NextResponse.json(
        {
          success: false,
          elevationRequested: true,
          elevated: false,
          result: elevationResult,
          error:
            "El proceso auxiliar se ejecutó, pero Windows no lo elevó.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      elevationRequested: true,
      elevated: true,
      result: elevationResult,
      message:
        "UAC fue verificado correctamente. No se ejecutó ningún instalador.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        elevationRequested: false,
        elevated: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido durante la prueba de elevación.",
      },
      { status: 500 }
    );
  }
}


