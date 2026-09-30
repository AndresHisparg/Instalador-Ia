import { NextResponse } from "next/server";

type InstallerSource = {
  componentId: string;
  componentName: string;
  provider: string;
  sourceType: "official-download-page";
  sourceUrl: string;
  platform: "windows";
  architecture: "x64";
  channel: "lts" | "stable";
  downloadStrategy: "resolve-official";
  verification: {
    required: boolean;
    method: "sha256" | "signature" | "installer-verification";
  };
};

const INSTALLER_SOURCES: InstallerSource[] = [
  {
    componentId: "node",
    componentName: "Node.js",
    provider: "Node.js",
    sourceType: "official-download-page",
    sourceUrl: "https://nodejs.org/en/download",
    platform: "windows",
    architecture: "x64",
    channel: "lts",
    downloadStrategy: "resolve-official",
    verification: {
      required: true,
      method: "sha256",
    },
  },
  {
    componentId: "git",
    componentName: "Git",
    provider: "Git for Windows",
    sourceType: "official-download-page",
    sourceUrl: "https://git-scm.com/install/windows",
    platform: "windows",
    architecture: "x64",
    channel: "stable",
    downloadStrategy: "resolve-official",
    verification: {
      required: true,
      method: "sha256",
    },
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: INSTALLER_SOURCES.length,
    sources: INSTALLER_SOURCES,
  });
}
