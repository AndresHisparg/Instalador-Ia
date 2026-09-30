import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type ComponentCheck = {
  id: string;
  name: string;
  required: boolean;
  installed: boolean;
  version: string | null;
  detail: string;
};

type InstallPlanItem = {
  componentId: string;
  componentName: string;
  required: boolean;
  status: "installed" | "missing";
  action: "none" | "install";
  version: string | null;
  reason: string;
};

async function checkCommand(
  command: string,
  args: string[]
): Promise<{ installed: boolean; version: string | null; detail: string }> {
  try {
    const result = await execFileAsync(command, args, {
      windowsHide: true,
    });

    const version =
      result.stdout.trim() ||
      result.stderr.trim() ||
      null;

    return {
      installed: true,
      version,
      detail: "Detectado correctamente.",
    };
  } catch (error) {
    return {
      installed: false,
      version: null,
      detail:
        error instanceof Error
          ? error.message
          : "No disponible.",
    };
  }
}

async function checkNpm(): Promise<{
  installed: boolean;
  version: string | null;
  detail: string;
}> {
  const npmCliPath =
    "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";

  try {
    const result = await execFileAsync(
      process.execPath,
      [npmCliPath, "--version"],
      {
        windowsHide: true,
      }
    );

    const version =
      result.stdout.trim() ||
      result.stderr.trim() ||
      null;

    return {
      installed: true,
      version,
      detail: "Detectado correctamente.",
    };
  } catch (error) {
    return {
      installed: false,
      version: null,
      detail:
        error instanceof Error
          ? error.message
          : "npm no disponible.",
    };
  }
}

async function detectComponents(): Promise<ComponentCheck[]> {
  const node = await checkCommand("node.exe", ["--version"]);
  const npm = await checkNpm();
  const git = await checkCommand("git.exe", ["--version"]);
  const powershell = await checkCommand(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$PSVersionTable.PSVersion.ToString()",
    ]
  );

  return [
    {
      id: "node",
      name: "Node.js",
      required: true,
      installed: node.installed,
      version: node.version,
      detail: node.detail,
    },
    {
      id: "npm",
      name: "npm",
      required: true,
      installed: npm.installed,
      version: npm.version,
      detail: npm.detail,
    },
    {
      id: "git",
      name: "Git",
      required: true,
      installed: git.installed,
      version: git.version,
      detail: git.detail,
    },
    {
      id: "powershell",
      name: "PowerShell",
      required: true,
      installed: powershell.installed,
      version: powershell.version,
      detail: powershell.detail,
    },
  ];
}

export async function GET() {
  const checks = await detectComponents();

  const plan: InstallPlanItem[] = checks.map((component) => {
    if (component.installed) {
      return {
        componentId: component.id,
        componentName: component.name,
        required: component.required,
        status: "installed",
        action: "none",
        version: component.version,
        reason: `${component.name} ya está instalado.`,
      };
    }

    return {
      componentId: component.id,
      componentName: component.name,
      required: component.required,
      status: "missing",
      action: "install",
      version: null,
      reason: `${component.name} no está instalado y es necesario.`,
    };
  });

  const missingRequired = plan.filter(
    (item) => item.required && item.status === "missing"
  );

  return NextResponse.json({
    success: true,
    ready: missingRequired.length === 0,
    plannedAt: new Date().toISOString(),
    totalComponents: plan.length,
    missingComponents: missingRequired.length,
    plan,
  });
}
