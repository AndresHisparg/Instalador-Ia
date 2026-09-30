import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const WORK_DIR = path.join(DATA_DIR, "work");
const ORDERS_LOG = path.join(DATA_DIR, "logs", "installation-orders.log");

const HELPER_PATH = path.join(WORK_DIR, "install-elevated.ps1");
const REQUEST_PATH = path.join(WORK_DIR, "elevated-install-request.json");
const RESULT_PATH = path.join(WORK_DIR, "elevated-install-result.json");

const AUTH_DIR = path.join(WORK_DIR, "authorizations");

const TRUSTED_HASHES: Record<string, string> = {
  node: "bb0eaee134f9357f22aea915ee793343e627aefc1e66488164bac6915bce2cac",
  git: "bfe94e7b419b16eee9fecbd1253a98e3d4f49ba8f029630549052278ffe286a6",
};

async function readLatestOrder(orderId: string) {
  try {
    const raw = await fs.readFile(ORDERS_LOG, "utf8");

    const orders = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((order) => order.orderId === orderId);

    return orders.length > 0 ? orders[orders.length - 1] : null;
  } catch {
    return null;
  }
}

async function consumeAuthorization(orderId: string, token: string) {
  const authPath = path.join(AUTH_DIR, `${orderId}.json`);

  let authorization: {
    orderId?: string;
    token?: string;
    used?: boolean;
  };

  try {
    authorization = JSON.parse(await fs.readFile(authPath, "utf8"));
  } catch {
    return false;
  }

  if (authorization.orderId !== orderId) {
    return false;
  }

  if (authorization.token !== token) {
    return false;
  }

  if (authorization.used === true) {
    return false;
  }

  authorization.used = true;
  authorization.usedAt = new Date().toISOString();

  const tempPath = `${authPath}.${crypto.randomBytes(8).toString("hex")}.tmp`;

  try {
    await fs.writeFile(
      tempPath,
      JSON.stringify(authorization, null, 2),
      "utf8"
    );

    await fs.rename(tempPath, authPath);
    return true;
  } catch {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    return false;
  }
}

function launchElevated(helperPath: string) {
  return new Promise<void>((resolve, reject) => {
    const escapedPath = helperPath.replace(/'/g, "''");

    const command =
      `Start-Process -FilePath 'powershell.exe' ` +
      `-Verb RunAs ` +
      `-ArgumentList @(` +
      `'-NoProfile',` +
      `'-ExecutionPolicy','Bypass',` +
      `'-File','${escapedPath}'` +
      `)`;

    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        command,
      ],
      {
        windowsHide: false,
        shell: false,
      }
    );

    child.on("error", reject);
    child.on("close", () => resolve());
  });
}

async function waitForResult(timeoutMs: number) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const raw = await fs.readFile(RESULT_PATH, "utf8");
      return JSON.parse(raw);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderId = String(body?.orderId ?? "");
    const token = String(body?.token ?? "");

    if (!orderId || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId y token son obligatorios.",
        },
        { status: 400 }
      );
    }

    const order = await readLatestOrder(orderId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró la orden.",
        },
        { status: 404 }
      );
    }

    if (order.status !== "awaiting-confirmation") {
      return NextResponse.json(
        {
          success: false,
          error: "La orden no está lista para ejecución.",
        },
        { status: 409 }
      );
    }

    if (order.verified !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "La orden no está verificada.",
        },
        { status: 403 }
      );
    }

    if (order.requiresAdministrator !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "La orden no requiere elevación administrativa.",
        },
        { status: 403 }
      );
    }

    if (!TRUSTED_HASHES[order.componentId]) {
      return NextResponse.json(
        {
          success: false,
          error: "El componente no está permitido.",
        },
        { status: 403 }
      );
    }

    if (order.sha256?.toLowerCase() !== TRUSTED_HASHES[order.componentId]) {
      return NextResponse.json(
        {
          success: false,
          error: "El SHA-256 de la orden no coincide con el registro confiable.",
        },
        { status: 403 }
      );
    }

    const consumed = await consumeAuthorization(orderId, token);

    if (!consumed) {
      return NextResponse.json(
        {
          success: false,
          error: "Token inválido, usado o no autorizado.",
        },
        { status: 403 }
      );
    }

    await fs.mkdir(WORK_DIR, { recursive: true });

    await fs.rm(RESULT_PATH, { force: true });

    await fs.writeFile(
      REQUEST_PATH,
      JSON.stringify(
        {
          orderId,
          requestedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );

    await launchElevated(HELPER_PATH);

    const result = await waitForResult(30 * 60 * 1000);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          elevationRequested: true,
          elevated: false,
          error:
            "No se recibió resultado del proceso elevado.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno durante la ejecución.",
      },
      { status: 500 }
    );
  }
}
