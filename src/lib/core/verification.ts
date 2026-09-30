import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

function run(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function checkCommand(
  name: string,
  command: string,
  args: string[],
  detailPrefix = "",
): Check {
  const result = run(command, args);

  return {
    name,
    passed: Boolean(result),
    detail: result
      ? `${detailPrefix}${result}`
      : `${command} no disponible`,
  };
}

export function verifySystem() {
  const checks: Check[] = [];

  const windowsPassed = process.platform === "win32";

  checks.push({
    name: "Windows",
    passed: windowsPassed,
    detail: windowsPassed
      ? "Windows detectado"
      : `Sistema detectado: ${process.platform}`,
  });

  const architecture = os.arch();

  checks.push({
    name: "Arquitectura x64",
    passed: architecture === "x64",
    detail: architecture,
  });

  const nodeVersion = process.version;

  checks.push({
    name: "Node.js",
    passed: Boolean(nodeVersion),
    detail: `Versión ${nodeVersion}`,
  });

  const npmVersion = run(process.execPath, [
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
    "--version",
  ]);

  checks.push({
    name: "npm",
    passed: Boolean(npmVersion),
    detail: npmVersion
      ? `Versión ${npmVersion}`
      : "npm no disponible",
  });

  checks.push(
    checkCommand(
      "Git",
      "git",
      ["--version"],
    ),
  );

  const powershellCommand =
    process.env.ComSpec && process.platform === "win32"
      ? "powershell.exe"
      : "powershell";

  checks.push(
    checkCommand(
      "PowerShell",
      powershellCommand,
      ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"],
      "Versión ",
    ),
  );

  const configPath = path.join(
    ROOT,
    "data",
    "config",
    "installer.json",
  );

  checks.push({
    name: "Configuración del instalador",
    passed: fs.existsSync(configPath),
    detail: fs.existsSync(configPath)
      ? "installer.json encontrado"
      : "installer.json no encontrado",
  });

  return {
    success: checks.every((check) => check.passed),
    ready: checks.every((check) => check.passed),
    checkedAt: new Date().toISOString(),
    checks,
  };
}
