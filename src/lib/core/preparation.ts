import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();

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

function detectTools() {
  const node = process.version;

  const npm = run(process.execPath, [
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
    "--version",
  ]);

  const git = run("git", ["--version"]);

  const powershellCommand =
    process.env.ComSpec && process.platform === "win32"
      ? "powershell.exe"
      : "powershell";

  const powershell = run(
    powershellCommand,
    ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"],
  );

  return {
    node: {
      installed: Boolean(node),
      version: node,
    },
    npm: {
      installed: Boolean(npm),
      version: npm,
    },
    git: {
      installed: Boolean(git),
      version: git,
    },
    powershell: {
      installed: Boolean(powershell),
      version: powershell,
    },
  };
}

export function prepareSystem() {
  const directories = [
    "data",
    "data/config",
    "data/logs",
    "data/work",
    "data/cache",
  ];

  const created: string[] = [];
  const existing: string[] = [];

  for (const relativePath of directories) {
    const absolutePath = path.join(ROOT, relativePath);

    if (fs.existsSync(absolutePath)) {
      existing.push(relativePath);
      continue;
    }

    fs.mkdirSync(absolutePath, { recursive: true });
    created.push(relativePath);
  }

  const tools = detectTools();

  const configPath = path.join(
    ROOT,
    "data",
    "config",
    "installer.json",
  );

  const config = {
    project: "instalador-ia",
    version: "0.1.0",
    preparedAt: new Date().toISOString(),
    status: "prepared",
    tools,
  };

  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2),
    "utf8",
  );

  const logPath = path.join(
    ROOT,
    "data",
    "logs",
    "installer.log",
  );

  const logEntry = {
    timestamp: new Date().toISOString(),
    event: "environment-prepared",
    tools,
  };

  fs.appendFileSync(
    logPath,
    `${JSON.stringify(logEntry)}${os.EOL}`,
    "utf8",
  );

  return {
    success: true,
    message: "Entorno preparado correctamente.",
    created,
    existing,
    tools,
  };
}

