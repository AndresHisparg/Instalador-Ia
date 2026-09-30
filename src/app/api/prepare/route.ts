import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PREPARED_DIRECTORIES = [
  "data",
  "data/config",
  "data/logs",
  "data/work",
  "data/cache",
];

type ToolStatus = {
  installed: boolean;
  version: string | null;
};

async function detectTool(
  command: string,
  args: string[]
): Promise<ToolStatus> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      windowsHide: true,
    });

    return {
      installed: true,
      version: stdout.trim(),
    };
  } catch {
    return {
      installed: false,
      version: null,
    };
  }
}

async function detectNpm(): Promise<ToolStatus> {
  try {
    const npmCli =
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";

    const { stdout } = await execFileAsync(
      process.execPath,
      [npmCli, "--version"],
      {
        windowsHide: true,
      }
    );

    return {
      installed: true,
      version: stdout.trim(),
    };
  } catch {
    return {
      installed: false,
      version: null,
    };
  }
}

export async function POST() {
  const projectRoot = process.cwd();

  const created: string[] = [];
  const existing: string[] = [];

  try {
    for (const relativeDirectory of PREPARED_DIRECTORIES) {
      const directoryPath = path.join(projectRoot, relativeDirectory);

      try {
        await fs.access(directoryPath);
        existing.push(relativeDirectory);
      } catch {
        await fs.mkdir(directoryPath, { recursive: true });
        created.push(relativeDirectory);
      }
    }

    const node = {
      installed: true,
      version: process.version,
    };

    const npm = await detectNpm();

    const git = await detectTool("git.exe", ["--version"]);

    const powershell = await detectTool("powershell.exe", [
      "-NoProfile",
      "-Command",
      "$PSVersionTable.PSVersion.ToString()",
    ]);

    const tools = {
      node,
      npm,
      git,
      powershell,
    };

    const configPath = path.join(
      projectRoot,
      "data",
      "config",
      "installer.json"
    );

    const config = {
      project: "instalador-ia",
      version: "0.1.0",
      preparedAt: new Date().toISOString(),
      status: "prepared",
      tools,
    };

    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      "utf8"
    );

    const logPath = path.join(
      projectRoot,
      "data",
      "logs",
      "installer.log"
    );

    const logEntry =
      `[${new Date().toISOString()}] ` +
      `Preparación completada. ` +
      `Node=${node.version}; ` +
      `npm=${npm.version ?? "not-found"}; ` +
      `Git=${git.version ?? "not-found"}; ` +
      `PowerShell=${powershell.version ?? "not-found"}\n`;

    await fs.appendFile(logPath, logEntry, "utf8");

    return Response.json({
      success: true,
      message: "Entorno preparado correctamente.",
      created,
      existing,
      tools,
    });
  } catch (error) {
    console.error("Preparation error:", error);

    return Response.json(
      {
        success: false,
        message: "No se pudo completar la preparación del entorno.",
      },
      { status: 500 }
    );
  }
}