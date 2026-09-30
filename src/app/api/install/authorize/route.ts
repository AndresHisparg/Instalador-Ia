import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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

type AuthorizationRecord = {
  orderId: string;
  token: string;
  createdAt: string;
  used: boolean;
};

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
        // Ignorar líneas inválidas.
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
        },
        { status: 400 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Autorización bloqueada. Se requiere confirmación explícita.",
          authorizationGranted: false,
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
          authorizationGranted: false,
        },
        { status: 404 }
      );
    }

    if (order.status !== "awaiting-confirmation") {
      return NextResponse.json(
        {
          success: false,
          error: `La orden no puede autorizarse porque su estado actual es: ${order.status}.`,
          authorizationGranted: false,
        },
        { status: 409 }
      );
    }

    if (!order.verified) {
      return NextResponse.json(
        {
          success: false,
          error: "La orden no está verificada.",
          authorizationGranted: false,
        },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");

    const authorizationDir = path.join(
      process.cwd(),
      "data",
      "work",
      "authorizations"
    );

    await fs.mkdir(authorizationDir, { recursive: true });

    const authorization: AuthorizationRecord = {
      orderId,
      token,
      createdAt: new Date().toISOString(),
      used: false,
    };

    const authorizationPath = path.join(
      authorizationDir,
      `${orderId}.json`
    );

    await fs.writeFile(
      authorizationPath,
      JSON.stringify(authorization, null, 2),
      {
        encoding: "utf8",
        flag: "wx",
      }
    );

    return NextResponse.json({
      success: true,
      authorizationGranted: true,
      orderId,
      token,
      message:
        "Autorización creada. El token es de un solo uso y todavía no ejecuta ningún instalador.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la autorización.",
        authorizationGranted: false,
      },
      { status: 500 }
    );
  }
}
