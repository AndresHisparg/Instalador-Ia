import { NextResponse } from "next/server";

type ResolvedInstaller = {
  componentId: string;
  componentName: string;
  provider: string;
  platform: "windows";
  architecture: "x64";
  version: string;
  fileName: string;
  downloadUrl: string;
  checksumUrl: string;
  sha256: string | null;
  sourceUrl: string;
  verifiedSource: boolean;
  status: "resolved" | "requires-resolution";
};

async function resolveNode(): Promise<ResolvedInstaller> {
  const sourceUrl = "https://nodejs.org/en/download";
  const indexUrl = "https://nodejs.org/dist/index.json";

  const indexResponse = await fetch(indexUrl, {
    cache: "no-store",
  });

  if (!indexResponse.ok) {
    throw new Error(
      `No se pudo consultar el indice oficial de Node.js: ${indexResponse.status}`,
    );
  }

  const releases = (await indexResponse.json()) as Array<{
    version: string;
    lts: string | false;
  }>;

  const ltsRelease = releases.find(
    (release) => release.lts !== false,
  );

  if (!ltsRelease) {
    throw new Error(
      "No se encontro una version LTS de Node.js.",
    );
  }

  const version = ltsRelease.version.replace(/^v/, "");
  const fileName = `node-v${version}-x64.msi`;

  const downloadUrl =
    `https://nodejs.org/dist/v${version}/${fileName}`;

  const checksumUrl =
    `https://nodejs.org/dist/v${version}/SHASUMS256.txt`;

  const checksumResponse = await fetch(checksumUrl, {
    cache: "no-store",
  });

  if (!checksumResponse.ok) {
    return {
      componentId: "node",
      componentName: "Node.js",
      provider: "Node.js",
      platform: "windows",
      architecture: "x64",
      version,
      fileName,
      downloadUrl,
      checksumUrl,
      sha256: null,
      sourceUrl,
      verifiedSource: false,
      status: "requires-resolution",
    };
  }

  const checksumText = await checksumResponse.text();

  const escapedFileName = fileName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const match = checksumText.match(
    new RegExp(
      `^([a-fA-F0-9]{64})\\s+\\*?${escapedFileName}$`,
      "m",
    ),
  );

  return {
    componentId: "node",
    componentName: "Node.js",
    provider: "Node.js",
    platform: "windows",
    architecture: "x64",
    version,
    fileName,
    downloadUrl,
    checksumUrl,
    sha256: match?.[1]?.toLowerCase() ?? null,
    sourceUrl,
    verifiedSource: match !== null,
    status: match ? "resolved" : "requires-resolution",
  };
}

async function resolveGit(): Promise<ResolvedInstaller> {
  const sourceUrl = "https://git-scm.com/install/windows";
  const version = "2.56.0";
  const fileName = `Git-${version}-64-bit.exe`;

  const downloadUrl =
    `https://github.com/git-for-windows/git/releases/download/v${version}.windows.1/${fileName}`;

  const sha256 =
    "bfe94e7b419b16eee9fecbd1253a98e3d4f49ba8f029630549052278ffe286a6";

  return {
    componentId: "git",
    componentName: "Git",
    provider: "Git for Windows",
    platform: "windows",
    architecture: "x64",
    version,
    fileName,
    downloadUrl,
    checksumUrl: sourceUrl,
    sha256,
    sourceUrl,
    verifiedSource: true,
    status: "resolved",
  };
}

export async function GET() {
  try {
    const [node, git] = await Promise.all([
      resolveNode(),
      resolveGit(),
    ]);

    const installers = [node, git];

    const success = installers.every(
      (installer) =>
        installer.verifiedSource &&
        installer.sha256 !== null &&
        installer.downloadUrl.length > 0,
    );

    return NextResponse.json({
      success,
      resolvedAt: new Date().toISOString(),
      count: installers.length,
      installers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
