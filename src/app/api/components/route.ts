import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type ComponentDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  required: boolean;
  detection: {
    type: "command";
    command: string;
    args: string[];
  };
};

type ComponentCheck = {
  id: string;
  name: string;
  required: boolean;
  installed: boolean;
  version: string | null;
  detail: string;
};

const COMPONENTS: ComponentDefinition[] = [
  {
    id: "node",
    name: "Node.js",
    description:
      "Entorno de ejecución necesario para las aplicaciones basadas en Node.js.",
    category: "runtime",
    required: true,
    detection: {
      type: "command",
      command: "node.exe",
      args: ["--version"],
    },
  },
  {
    id: "npm",
    name: "npm",
    description:
      "Gestor de paquetes utilizado para instalar y administrar dependencias.",
    category: "package-manager",
    required: true,
    detection: {
      type: "command",
      command: "npm.cmd",
      args: ["--version"],
    },
  },
  {
    id: "git",
    name: "Git",
    description:
      "Sistema de control de versiones utilizado por el proyecto.",
    category: "development",
    required: true,
    detection: {
      type: "command",
      command: "git.exe",
      args: ["--version"],
    },
  },
  {
    id: "powershell",
    name: "PowerShell",
    description:
      "Shell utilizada para ejecutar tareas de administración y automatización en Windows.",
    category: "system",
    required: true,
    detection: {
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

async function checkComponent(
  component: ComponentDefinition
): Promise<ComponentCheck> {
  try {
    const result = await execFileAsync(
      component.detection.command,
      component.detection.args,
      {
        windowsHide: true,
      }
    );

    const version =
      result.stdout.trim() ||
      result.stderr.trim() ||
      null;

    return {
      id: component.id,
      name: component.name,
      required: component.required,
      installed: true,
      version,
      detail: `${component.name} detectado correctamente.`,
    };
  } catch (error) {
    return {
      id: component.id,
      name: component.name,
      required: component.required,
      installed: false,
      version: null,
      detail:
        error instanceof Error
          ? error.message
          : `${component.name} no está disponible.`,
    };
  }
}

export async function GET() {
  const checks = await Promise.all(
    COMPONENTS.map((component) => checkComponent(component))
  );

  const requiredComponents = checks.filter(
    (component) => component.required
  );

  const ready = requiredComponents.every(
    (component) => component.installed
  );

  return NextResponse.json({
    success: true,
    ready,
    checkedAt: new Date().toISOString(),
    count: checks.length,
    checks,
  });
}