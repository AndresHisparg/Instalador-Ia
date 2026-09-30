import os from "os";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function getCommandVersion(
  command: string,
  args: string[]
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      windowsHide: true,
    });

    return stdout.trim();
  } catch {
    return null;
  }
}

async function getNpmVersion(): Promise<string | null> {
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

    return stdout.trim();
  } catch {
    return null;
  }
}

export async function GET() {
  const totalMemoryGB = os.totalmem() / 1024 / 1024 / 1024;
  const freeMemoryGB = os.freemem() / 1024 / 1024 / 1024;

  const npmVersion = await getNpmVersion();
  const gitVersion = await getCommandVersion("git.exe", ["--version"]);

  let diskTotalGB: number | null = null;
  let diskFreeGB: number | null = null;

  try {
    const disk = fs.statfsSync("C:\\");

    diskTotalGB = Number(
      ((disk.blocks * disk.bsize) / 1024 / 1024 / 1024).toFixed(2)
    );

    diskFreeGB = Number(
      ((disk.bavail * disk.bsize) / 1024 / 1024 / 1024).toFixed(2)
    );
  } catch {
    diskTotalGB = null;
    diskFreeGB = null;
  }

  return Response.json({
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    npmVersion,
    gitVersion,
    cpuCores: os.cpus().length,
    totalMemoryGB: Number(totalMemoryGB.toFixed(2)),
    freeMemoryGB: Number(freeMemoryGB.toFixed(2)),
    diskTotalGB,
    diskFreeGB,
    hostname: os.hostname(),
  });
}