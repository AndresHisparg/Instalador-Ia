import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { detectComponents } from "@/lib/core/component-registry";

const ROOT = process.cwd();

export async function prepareSystem() {
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

  const checks = await detectComponents();

  const tools = Object.fromEntries(
    checks.map((check) => [
      check.id,
      {
        installed: check.installed,
        version: check.version ?? "",
      },
    ]),
  );

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
    checks,
  };
}