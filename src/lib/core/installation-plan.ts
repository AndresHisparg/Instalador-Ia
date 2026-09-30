import {
  getInstallerRegistry,
  type InstallerDefinition,
} from "@/lib/core/installer-registry";

type PlannedComponent = {
  id: string;
  name: string;
  enabled: boolean;
  installerType: InstallerDefinition["installerType"];
  provider: string;
  versionStrategy: InstallerDefinition["versionStrategy"];
  requiresAdministrator: boolean;
  action: "install" | "system" | "dependency";
  source: string | null;
  verification: {
    type: InstallerDefinition["verification"]["type"];
    command: string | null;
    args: string[];
  };
};

function getAction(
  installerType: InstallerDefinition["installerType"],
): PlannedComponent["action"] {
  switch (installerType) {
    case "system":
      return "system";

    case "package-manager":
      return "dependency";

    case "official-installer":
    default:
      return "install";
  }
}

export function planInstallation() {
  const registry = getInstallerRegistry();

  const components: PlannedComponent[] = registry.map((installer) => ({
    id: installer.componentId,
    name: installer.componentName,
    enabled: installer.enabled,
    installerType: installer.installerType,
    provider: installer.provider,
    versionStrategy: installer.versionStrategy,
    requiresAdministrator: installer.requiresAdministrator,
    action: getAction(installer.installerType),
    source: installer.source,
    verification: {
      type: installer.verification.type,
      command: installer.verification.command,
      args: [...installer.verification.args],
    },
  }));

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
      trusted: 0,
    },
  };
}
