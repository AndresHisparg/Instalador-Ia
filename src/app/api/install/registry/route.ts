import { NextResponse } from "next/server";
import { getInstallerRegistry } from "@/lib/core/installer-registry";

export async function GET() {
  const installers = getInstallerRegistry();

  return NextResponse.json({
    success: true,
    count: installers.length,
    installers,
  });
}
