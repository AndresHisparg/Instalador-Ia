import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type CheckResult = {
  name: string;
  passed: boolean;
  detail: string;
};

async function checkCommand(
  command: string,
  args: string[]
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      windowsHide: true,
    });

    return stdout.trim();
  } catch {
    return null;
  }
}

async function checkNpm(): Promise<string | null> {
  try {
    const npmCli =
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";

    const { stdout } = await execFileAsync(
      process.execPath,
      [npmCli, "--version"],
      {
        windowsHide: true,
      }
    );

    return stdout.trim();
  } catch {
    return null;
  }
}

export async function GET() {
  const checks: CheckResult[] = [];

  checks.push({
    name: "Windows",
    passed: process.platform === "win32",
    detail:
      process.platform === "win32"
        ? "Windows detectado"
        : `Sistema detectado: ${process.platform}`,
  });

  checks.push({
    name: "Arquitectura x64",
    passed: process.arch === "x64",
    detail:
      process.arch === "x64"
        ? "x64"
        : `Arquitectura detectada: ${process.arch}`,
  });

  const nodeVersion = process.version;

  checks.push({
    name: "Node.js",
    passed: !!nodeVersion,
    detail: nodeVersion
      ? `Versión ${nodeVersion}`
      : "Node.js no detectado",
  });

  const npmVersion = await checkNpm();

  checks.push({
    name: "npm",
    passed: !!npmVersion,
    detail: npmVersion
      ? `Versión ${npmVersion}`
      : "npm no detectado",
  });

  const gitVersion = await checkCommand("git.exe", ["--version"]);

  checks.push({
    name: "Git",
    passed: !!gitVersion,
    detail: gitVersion ?? "Git no detectado",
  });

  const powershellVersion = await checkCommand("powershell.exe", [
    "-NoProfile",
    "-Command",
    "$PSVersionTable.PSVersion.ToString()",
  ]);

  checks.push({
    name: "PowerShell",
    passed: !!powershellVersion,
    detail: powershellVersion
      ? `Versión ${powershellVersion}`
      : "PowerShell no detectado",
  });

  const configPath = path.join(
    process.cwd(),
    "data",
    "config",
    "installer.json"
  );

  let configExists = false;

  try {
    await fs.access(configPath);
    configExists = true;
  } catch {
    configExists = false;
  }

  checks.push({
    name: "Configuración del instalador",
    passed: configExists,
    detail: configExists
      ? "installer.json encontrado"
      : "installer.json no encontrado",
  });

  const ready = checks.every((check) => check.passed);

  return Response.json({
    success: true,
    ready,
    checkedAt: new Date().toISOString(),
    checks,
  });
}