import { NextResponse } from "next/server";

import {
  detectComponents,
  getComponentRegistry,
} from "@/lib/core/component-registry";

export async function GET() {
  const registry = getComponentRegistry();
  const checks = await detectComponents();

  return NextResponse.json({
    success: true,
    ready: checks.every(
      (check) => !check.required || check.installed,
    ),
    checkedAt: new Date().toISOString(),
    count: registry.length,
    checks,
  });
}