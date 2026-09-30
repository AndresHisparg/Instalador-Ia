import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

type RegistryComponent = {
  id?: unknown;
  name?: unknown;
  enabled?: unknown;
  requiresAdministrator?: unknown;
  trusted?: unknown;
  type?: unknown;
};

type PlannedComponent = {
  id: string;
  name: string;
  enabled: boolean;
  requiresAdministrator: boolean;
  trusted: boolean;
  action: "install" | "system" | "dependency";
};

function loadRegistry(): Record<string, unknown> {
  const registryPath = path.join(
    ROOT,
    "data",
    "config",
    "installer-registry.json",
  );

  if (!fs.existsSync(registryPath)) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(registryPath, "utf8"),
    );

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }

    return {};
  } catch {
    return {};
  }
}

function toRegistryComponent(
  value: unknown,
): RegistryComponent | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as RegistryComponent;
}

export function planInstallation() {
  const registry = loadRegistry();

  const components: PlannedComponent[] = [];

  const rawComponents = Array.isArray(registry.components)
    ? registry.components
    : Object.entries(registry).map(([id, value]) => ({
        id,
        ...(typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
          ? value
          : {}),
      }));

  for (const rawItem of rawComponents) {
    const item = toRegistryComponent(rawItem);

    if (!item) {
      continue;
    }

    const id =
      typeof item.id === "string"
        ? item.id
        : "";

    if (!id) {
      continue;
    }

    const type =
      typeof item.type === "string"
        ? item.type
        : "";

    components.push({
      id,
      name:
        typeof item.name === "string"
          ? item.name
          : id,
      enabled: item.enabled === true,
      requiresAdministrator:
        item.requiresAdministrator === true,
      trusted: item.trusted === true,
      action:
        type === "system"
          ? "system"
          : type === "dependency"
            ? "dependency"
            : "install",
    });
  }

  return {
    success: true,
    plannedAt: new Date().toISOString(),
    dryRun: true,
    executionAllowed: false,
    requiresConfirmation: true,
    components,
    summary: {
      total: components.length,
      enabled: components.filter(
        (component) => component.enabled,
      ).length,
      administratorRequired: components.filter(
        (component) => component.requiresAdministrator,
      ).length,
      trusted: components.filter(
        (component) => component.trusted,
      ).length,
    },
  };
}
