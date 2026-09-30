import { spawn } from "child_process";
import { NextResponse } from "next/server";

type ComponentCheck = {
  id: string;
  name: string;
  required: boolean;
  installed: boolean;
  version: string | null;
  error: string | null;
};

type InstallerDefinition = {
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

function getInstallerRegistry(): InstallerDefinition[] {
  return [
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
}

function getNpmCliPath(): string {
  return "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
}

async function detectComponent(
  id: string,
  name: string,
  required: boolean,
): Promise<ComponentCheck> {
  try {
    if (id === "node") {
      const result = await runCommand(process.execPath, ["--version"]);

      return {
        id,
        name,
        required,
        installed: result.exitCode === 0,
        version: result.stdout.trim() || null,
        error: result.exitCode === 0 ? null : result.stderr.trim() || null,
      };
    }

    if (id === "npm") {
      const result = await runCommand(process.execPath, [
        getNpmCliPath(),
        "--version",
      ]);

      return {
        id,
        name,
        required,
        installed: result.exitCode === 0,
        version: result.stdout.trim() || null,
        error: result.exitCode === 0 ? null : result.stderr.trim() || null,
      };
    }

    if (id === "git") {
      const result = await runCommand("git.exe", ["--version"]);

      return {
        id,
        name,
        required,
        installed: result.exitCode === 0,
        version: result.stdout.trim() || null,
        error: result.exitCode === 0 ? null : result.stderr.trim() || null,
      };
    }

    if (id === "powershell") {
      const result = await runCommand("powershell.exe", [
        "-NoProfile",
        "-Command",
        "$PSVersionTable.PSVersion.ToString()",
      ]);

      return {
        id,
        name,
        required,
        installed: result.exitCode === 0,
        version: result.stdout.trim() || null,
        error: result.exitCode === 0 ? null : result.stderr.trim() || null,
      };
    }

    return {
      id,
      name,
      required,
      installed: false,
      version: null,
      error: "Componente no reconocido",
    };
  } catch (error) {
    return {
      id,
      name,
      required,
      installed: false,
      version: null,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

function runCommand(
  command: string,
  args: string[],
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {

    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (error: Error) => {
      resolve({
        exitCode: -1,
        stdout,
        stderr: error.message,
      });
    });

    child.on("close", (code: number | null) => {
      resolve({
        exitCode: code ?? -1,
        stdout,
        stderr,
      });
    });
  });
}

export async function GET() {
  const components = [
    {
      id: "node",
      name: "Node.js",
      required: true,
    },
    {
      id: "npm",
      name: "npm",
      required: true,
    },
    {
      id: "git",
      name: "Git",
      required: true,
    },
    {
      id: "powershell",
      name: "PowerShell",
      required: true,
    },
  ];

  const checks = await Promise.all(
    components.map((component) =>
      detectComponent(component.id, component.name, component.required),
    ),
  );

  const registry = getInstallerRegistry();

  const plan = checks.map((check) => {
    const installer = registry.find(
      (item) => item.componentId === check.id,
    );

    if (check.installed) {
      return {
        componentId: check.id,
        componentName: check.name,
        required: check.required,
        status: "installed",
        version: check.version,
        action: "none",
        installerAvailable: installer?.enabled ?? false,
        requiresAdministrator: installer?.requiresAdministrator ?? false,
        installerType: installer?.installerType ?? null,
        provider: installer?.provider ?? null,
      };
    }

    if (!installer) {
      return {
        componentId: check.id,
        componentName: check.name,
        required: check.required,
        status: "missing",
        version: null,
        action: "unavailable",
        installerAvailable: false,
        requiresAdministrator: false,
        installerType: null,
        provider: null,
      };
    }

    if (!installer.enabled) {
      return {
        componentId: check.id,
        componentName: check.name,
        required: check.required,
        status: "missing",
        version: null,
        action: "pending-installer",
        installerAvailable: false,
        requiresAdministrator: installer.requiresAdministrator,
        installerType: installer.installerType,
        provider: installer.provider,
      };
    }

    return {
      componentId: check.id,
      componentName: check.name,
      required: check.required,
      status: "missing",
      version: null,
      action: "install",
      installerAvailable: true,
      requiresAdministrator: installer.requiresAdministrator,
      installerType: installer.installerType,
      provider: installer.provider,
    };
  });

  const missingComponents = plan.filter(
    (item) => item.status === "missing",
  );

  const installableComponents = plan.filter(
    (item) => item.action === "install",
  );

  const ready = missingComponents.length === 0;

  return NextResponse.json({
    success: true,
    ready,
    plannedAt: new Date().toISOString(),
    totalComponents: plan.length,
    missingComponents: missingComponents.length,
    installableComponents: installableComponents.length,
    registryCount: registry.length,
    plan,
  });
}

