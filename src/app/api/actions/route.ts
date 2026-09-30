import { NextRequest, NextResponse } from "next/server";
import {
  getActionCatalog,
  validateAction,
} from "@/lib/actions/engine";

export async function GET() {
  return NextResponse.json(getActionCatalog());
}

export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    input?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "El cuerpo debe ser JSON.",
      },
      { status: 400 },
    );
  }

  if (!body.action) {
    return NextResponse.json(
      {
        success: false,
        error: "Falta el campo action.",
      },
      { status: 400 },
    );
  }

  const blocked = validateAction({
    action: body.action,
    input: body.input,
  });

  if (blocked) {
    return NextResponse.json(
      blocked,
      { status: blocked.status === "unknown" ? 404 : 403 },
    );
  }

  return NextResponse.json({
    success: true,
    action: body.action,
    status: "completed",
    result: {
      message:
        "Acción validada. La ejecución específica se conectará en el siguiente paso.",
      input: body.input ?? {},
    },
  });
}
