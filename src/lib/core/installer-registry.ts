export type InstallerDefinition = {
  componentId: string;
  componentName: string;
  enabled: boolean;
  installerType: "official-installer" | "package-manager" | "system";
  provider: string;
  source: string | null;
  versionStrategy: "latest" | "fixed" | "system";
  requiresAdministrator: boolean;
  executable: string | null;
  allowedArguments: string[];
  verification: {
    type: "command" | "file" | "system";
    command: string | null;
    args: string[];
  };
};

export const INSTALLER_REGISTRY: InstallerDefinition[] = [
  {
    componentId: "node",
    componentName: "Node.js",
    enabled: false,
    installerType: "official-installer",
    provider: "Node.js",
    source: null,
    versionStrategy: "latest",
    requiresAdministrator: true,
    executable: null,
    allowedArguments: [],
    verification: {
      type: "command",
      command: "node.exe",
      args: ["--version"],
    },
  },
  {
    componentId: "npm",
    componentName: "npm",
    enabled: false,
    installerType: "package-manager",
    provider: "Node.js",
    source: null,
    versionStrategy: "system",
    requiresAdministrator: false,
    executable: null,
    allowedArguments: [],
    verification: {
      type: "command",
      command: "npm",
      args: ["--version"],
    },
  },
  {
    componentId: "git",
    componentName: "Git",
    enabled: false,
    installerType: "official-installer",
    provider: "Git",
    source: null,
    versionStrategy: "latest",
    requiresAdministrator: true,
    executable: null,
    allowedArguments: [],
    verification: {
      type: "command",
      command: "git.exe",
      args: ["--version"],
    },
  },
  {
    componentId: "powershell",
    componentName: "PowerShell",
    enabled: false,
    installerType: "system",
    provider: "Microsoft",
    source: null,
    versionStrategy: "system",
    requiresAdministrator: true,
    executable: null,
    allowedArguments: [],
    verification: {
      type: "command",
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-Command",
        "$PSVersionTable.PSVersion.ToString()",
      ],
    },
  },
];

export function getInstallerRegistry(): InstallerDefinition[] {
  return INSTALLER_REGISTRY;
}

export function getInstaller(
  componentId: string,
): InstallerDefinition | undefined {
  return INSTALLER_REGISTRY.find(
    (installer) => installer.componentId === componentId,
  );
}
