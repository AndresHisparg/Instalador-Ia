import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { detectComponents } from "@/lib/core/component-registry";

const ROOT = process.cwd();

export async function verifySystem() {
  const checks = [];

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

  const components = await detectComponents();

  for (const component of components) {
    checks.push({
      name: component.name,
      passed: component.installed,
      detail: component.installed
        ? `Versión ${component.version}`
        : component.error ?? `${component.name} no disponible`,
    });
  }

  const configPath = path.join(
    ROOT,
    "data",
    "config",
    "installer.json",
  );

  const configExists = fs.existsSync(configPath);

  checks.push({
    name: "Configuración del instalador",
    passed: configExists,
    detail: configExists
      ? "installer.json encontrado"
      : "installer.json no encontrado",
  });

  return {
    success: checks.every((check) => check.passed),
    ready: checks.every((check) => check.passed),
    checkedAt: new Date().toISOString(),
    checks,
    components,
  };
}