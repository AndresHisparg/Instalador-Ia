import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import crypto from "crypto";

const TRUSTED_HASHES: Record<string, string> = {
  node: "bb0eaee134f9357f22aea915ee793343e627aefc1e66488164bac6915bce2cac",
  git: "bfe94e7b419b16eee9fecbd1253a98e3d4f49ba8f029630549052278ffe286a6",
};

type InstallationOrder = {
  orderId: string;
  createdAt: string;
  componentId: string;
  componentName: string;
  version: string;
  installerPath: string;
  fileSize: number;
  sha256: string;
  verified: boolean;
  requiresAdministrator: boolean;
  executionAllowed: boolean;
  status: string;
};

async function calculateSha256(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest("hex");
}

async function appendAudit(order: InstallationOrder) {
  const logPath = path.join(
    process.cwd(),
    "data",
    "logs",
    "installation-orders.log"
  );

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, JSON.stringify(order) + "\n", "utf8");
}

async function readOrder(orderId: string): Promise<InstallationOrder | null> {
  const logPath = path.join(
    process.cwd(),
    "data",
    "logs",
    "installation-orders.log"
  );

  try {
    const content = await fs.readFile(logPath, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const order = JSON.parse(lines[i]) as InstallationOrder;

        if (order.orderId === orderId) {
          return order;
        }
      } catch {
        // Ignorar líneas de auditoría inválidas.
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderId =
      typeof body?.orderId === "string" ? body.orderId.trim() : "";

    const confirm = body?.confirm === true;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId es obligatorio.",
          executionAllowed: false,
        },
        { status: 400 }
      );
    }

    // PRIMERA BARRERA:
    // Nunca se permite continuar sin confirmación explícita.
    if (!confirm) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ejecución bloqueada. Se requiere confirmación explícita.",
          executionAllowed: false,
        },
        { status: 403 }
      );
    }

    const order = await readOrder(orderId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Orden de instalación no encontrada.",
          executionAllowed: false,
        },
        { status: 404 }
      );
    }

    if (order.status !== "awaiting-confirmation" || order.executionAllowed === true) {
      return NextResponse.json(
        {
          success: false,
          error: `La orden no puede ejecutarse porque su estado actual es: ${order.status}.`,
          executionAllowed: false,
        },
        { status: 409 }
      );
    }

    if (!order.verified) {
      return NextResponse.json(
        {
          success: false,
          error: "La orden no está verificada.",
          executionAllowed: false,
        },
        { status: 409 }
      );
    }

    if (!order.requiresAdministrator) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La orden no contiene el requisito de privilegios administrativos esperado.",
          executionAllowed: false,
        },
        { status: 409 }
      );
    }

    // En esta fase solo permitimos Node.js.
    // Git seguirá bloqueado hasta implementar su ejecución controlada.
    if (order.componentId !== "node") {
      return NextResponse.json(
        {
          success: false,
          error: "Componente no permitido para ejecución controlada.",
          executionAllowed: false,
        },
        { status: 400 }
      );
    }

    const trustedHash = TRUSTED_HASHES[order.componentId];

    if (!trustedHash) {
      return NextResponse.json(
        {
          success: false,
          error: "No existe una huella de confianza para este componente.",
          executionAllowed: false,
        },
        { status: 409 }
      );
    }

    const installerExists = await fs
      .stat(order.installerPath)
      .then((stat) => stat.isFile())
      .catch(() => false);

    if (!installerExists) {
      return NextResponse.json(
        {
          success: false,
          error: "El instalador no existe en la ruta registrada.",
          executionAllowed: false,
        },
        { status: 404 }
      );
    }

    const stat = await fs.stat(order.installerPath);

    if (stat.size !== order.fileSize) {
      return NextResponse.json(
        {
          success: false,
          error: "El tamaño del instalador ha cambiado.",
          executionAllowed: false,
        },
        { status: 409 }
      );
    }

    const actualHash = await calculateSha256(order.installerPath);

    if (actualHash !== order.sha256 || actualHash !== trustedHash) {
      return NextResponse.json(
        {
          success: false,
          error: "La verificación SHA-256 del instalador ha fallado.",
          executionAllowed: false,
        },
        { status: 409 }
      );
    }

    const executingOrder: InstallationOrder = {
      ...order,
      executionAllowed: true,
      status: "executing",
    };

    await appendAudit(executingOrder);

    const child = spawn(
      "msiexec.exe",
      ["/i", order.installerPath],
      {
        detached: false,
        shell: false,
        windowsHide: false,
      }
    );

    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on("error", reject);

      child.on("exit", (code) => {
        resolve(code ?? -1);
      });
    });

    const finalOrder: InstallationOrder = {
      ...executingOrder,
      executionAllowed: false,
      status: exitCode === 0 ? "completed" : `failed-${exitCode}`,
    };

    await appendAudit(finalOrder);

    return NextResponse.json({
      success: exitCode === 0,
      executionStarted: true,
      executionAllowed: false,
      orderId: order.orderId,
      componentId: order.componentId,
      exitCode,
      status: finalOrder.status,
      message:
        exitCode === 0
          ? "El instalador terminó correctamente."
          : `El instalador terminó con código ${exitCode}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno durante la ejecución.",
        executionAllowed: false,
      },
      { status: 500 }
    );
  }
}

