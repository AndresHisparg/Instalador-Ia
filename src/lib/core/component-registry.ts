import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ComponentId =
  | "node"
  | "npm"
  | "git"
  | "powershell";

export type ComponentDefinition = {
  id: ComponentId;
  name: string;
  required: boolean;
  command: string;
  args: string[];
};

export type ComponentCheck = {
  id: ComponentId;
  name: string;
  required: boolean;
  installed: boolean;
  version: string | null;
  error: string | null;
};

const npmCliPath = () =>
  `${process.execPath.substring(
    0,
    process.execPath.lastIndexOf("\\"),
  )}\\node_modules\\npm\\bin\\npm-cli.js`;

export const COMPONENT_REGISTRY: ComponentDefinition[] = [
  {
    id: "node",
    name: "Node.js",
    required: true,
    command: process.execPath,
    args: ["--version"],
  },
  {
    id: "npm",
    name: "npm",
    required: true,
    command: process.execPath,
    args: [npmCliPath(), "--version"],
  },
  {
    id: "git",
    name: "Git",
    required: true,
    command: process.platform === "win32" ? "git.exe" : "git",
    args: ["--version"],
  },
  {
    id: "powershell",
    name: "PowerShell",
    required: true,
    command:
      process.platform === "win32"
        ? "powershell.exe"
        : "powershell",
    args: [
      "-NoProfile",
      "-Command",
      "$PSVersionTable.PSVersion.ToString()",
    ],
  },
];

export function getComponentRegistry(): ComponentDefinition[] {
  return COMPONENT_REGISTRY.map((component) => ({
    ...component,
    args: [...component.args],
  }));
}

export function getComponent(
  componentId: string,
): ComponentDefinition | undefined {
  return COMPONENT_REGISTRY.find(
    (component) => component.id === componentId,
  );
}

async function runComponent(
  component: ComponentDefinition,
): Promise<ComponentCheck> {
  try {
    const result = await execFileAsync(
      component.command,
      component.args,
      {
        windowsHide: true,
        shell: false,
        encoding: "utf8",
      },
    );

    const version = result.stdout.trim();

    return {
      id: component.id,
      name: component.name,
      required: component.required,
      installed: Boolean(version),
      version: version || null,
      error: version ? null : "No se obtuvo una versión válida.",
    };
  } catch (error) {
    return {
      id: component.id,
      name: component.name,
      required: component.required,
      installed: false,
      version: null,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido durante la detección.",
    };
  }
}

export async function detectComponent(
  componentId: string,
): Promise<ComponentCheck> {
  const component = getComponent(componentId);

  if (!component) {
    return {
      id: componentId as ComponentId,
      name: componentId,
      required: false,
      installed: false,
      version: null,
      error: "Componente no registrado.",
    };
  }

  return runComponent(component);
}

export async function detectComponents(): Promise<ComponentCheck[]> {
  return Promise.all(
    COMPONENT_REGISTRY.map((component) =>
      runComponent(component),
    ),
  );
}
