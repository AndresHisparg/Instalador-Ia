import fs from "fs/promises";
import path from "path";

const PREPARED_DIRECTORIES = [
  "data",
  "data/config",
  "data/logs",
  "data/work",
  "data/cache",
];

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

    const configPath = path.join(projectRoot, "data", "config", "installer.json");

    let configCreated = false;

    try {
      await fs.access(configPath);
    } catch {
      const config = {
        project: "instalador-ia",
        version: "0.1.0",
        preparedAt: new Date().toISOString(),
        status: "prepared",
      };

      await fs.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        "utf8"
      );

      configCreated = true;
    }

    const logPath = path.join(projectRoot, "data", "logs", "installer.log");

    const logEntry = `[${new Date().toISOString()}] Preparación completada\n`;

    await fs.appendFile(logPath, logEntry, "utf8");

    return Response.json({
      success: true,
      message: "Entorno preparado correctamente.",
      created,
      existing,
      configCreated,
      logCreated: true,
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