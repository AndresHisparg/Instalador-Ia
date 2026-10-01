import fs from "node:fs";
import os from "node:os";

import { NextResponse } from "next/server";

import {
  detectComponents,
  getComponentRegistry,
} from "@/lib/core/component-registry";

export async function GET() {
  const totalMemoryGB =
    os.totalmem() / 1024 / 1024 / 1024;

  const freeMemoryGB =
    os.freemem() / 1024 / 1024 / 1024;

  const checks = await detectComponents();
  const registry = getComponentRegistry();

  let diskTotalGB: number | null = null;
  let diskFreeGB: number | null = null;

  try {
    const disk = fs.statfsSync("C:\\");

    diskTotalGB = Number(
      ((disk.blocks * disk.bsize) / 1024 / 1024 / 1024).toFixed(2),
    );

    diskFreeGB = Number(
      ((disk.bavail * disk.bsize) / 1024 / 1024 / 1024).toFixed(2),
    );
  } catch {
    diskTotalGB = null;
    diskFreeGB = null;
  }

  const required = checks.filter((check) => check.required);
  const ready = required.every((check) => check.installed);

  const componentVersions = Object.fromEntries(
    checks.map((check) => [check.id, check.version]),
  );

  return NextResponse.json({
    success: true,
    ready,
    checkedAt: new Date().toISOString(),

    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,

    npmVersion: componentVersions.npm ?? null,
    gitVersion: componentVersions.git ?? null,
    powershellVersion: componentVersions.powershell ?? null,

    cpuCores: os.cpus().length,
    totalMemoryGB: Number(totalMemoryGB.toFixed(2)),
    freeMemoryGB: Number(freeMemoryGB.toFixed(2)),
    diskTotalGB,
    diskFreeGB,
    hostname: os.hostname(),

    count: registry.length,
    checks,
  });
}
