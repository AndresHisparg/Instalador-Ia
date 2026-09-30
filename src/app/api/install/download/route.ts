import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

type InstallerDefinition = {
  componentId: "node" | "git";
  componentName: string;
  version: string;
  fileName: string;
  downloadUrl: string;
  sha256: string;
};

const INSTALLERS: InstallerDefinition[] = [
  {
    componentId: "node",
    componentName: "Node.js",
    version: "24.21.0",
    fileName: "node-v24.21.0-x64.msi",
    downloadUrl:
      "https://nodejs.org/dist/v24.21.0/node-v24.21.0-x64.msi",
    sha256:
      "bb0eaee134f9357f22aea915ee793343e627aefc1e66488164bac6915bce2cac",
  },
  {
    componentId: "git",
    componentName: "Git",
    version: "2.56.0",
    fileName: "Git-2.56.0-64-bit.exe",
    downloadUrl:
      "https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.1/Git-2.56.0-64-bit.exe",
    sha256:
      "bfe94e7b419b16eee9fecbd1253a98e3d4f49ba8f029630549052278ffe286a6",
  },
];

function getInstaller(componentId: string) {
  return INSTALLERS.find(
    (installer) => installer.componentId === componentId,
  );
}

async function calculateSha256(
  filePath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", reject);
  });
}

async function downloadFile(
  url: string,
  destination: string,
): Promise<void> {
  const response = await fetch(url, {
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `La descarga fallo con HTTP ${response.status}`,
    );
  }

  const fileStream = fs.createWriteStream(destination);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        fileStream.write(Buffer.from(value));
      }
    }
  } finally {
    fileStream.end();
  }

  await new Promise<void>((resolve, reject) => {
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const componentId = body?.componentId;

    if (
      componentId !== "node" &&
      componentId !== "git"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Componente no permitido. Solo se permiten node o git.",
        },
        { status: 400 },
      );
    }

    const installer = getInstaller(componentId);

    if (!installer) {
      return NextResponse.json(
        {
          success: false,
          error: "Instalador no registrado.",
        },
        { status: 404 },
      );
    }

    const cacheDirectory = path.join(
      process.cwd(),
      "data",
      "cache",
      "installers",
    );

    fs.mkdirSync(cacheDirectory, {
      recursive: true,
    });

    const destination = path.join(
      cacheDirectory,
      installer.fileName,
    );

    await downloadFile(
      installer.downloadUrl,
      destination,
    );

    if (!fs.existsSync(destination)) {
      throw new Error(
        "La descarga termino pero el archivo no existe.",
      );
    }

    const stats = fs.statSync(destination);

    if (stats.size === 0) {
      fs.unlinkSync(destination);

      throw new Error(
        "La descarga genero un archivo vacio.",
      );
    }

    const actualSha256 = await calculateSha256(
      destination,
    );

    const expectedSha256 =
      installer.sha256.toLowerCase();

    const verified =
      actualSha256.toLowerCase() === expectedSha256;

    if (!verified) {
      try {
        fs.unlinkSync(destination);
      } catch {
        // No interrumpir la respuesta por un error de limpieza.
      }

      return NextResponse.json(
        {
          success: false,
          verified: false,
          componentId: installer.componentId,
          componentName: installer.componentName,
          version: installer.version,
          fileName: installer.fileName,
          fileSize: stats.size,
          expectedSha256,
          actualSha256,
          error:
            "El SHA-256 no coincide. El archivo descargado fue eliminado.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      componentId: installer.componentId,
      componentName: installer.componentName,
      version: installer.version,
      fileName: installer.fileName,
      fileSize: stats.size,
      path: destination,
      expectedSha256,
      actualSha256,
      executed: false,
      message:
        "Archivo descargado y verificado correctamente. El instalador NO ha sido ejecutado.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido durante la descarga.",
      },
      { status: 500 },
    );
  }
}
