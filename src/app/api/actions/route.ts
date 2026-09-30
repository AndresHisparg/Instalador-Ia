import { NextRequest, NextResponse } from "next/server";
import {
  executeAction,
  getActionCatalog,
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

  const result = await executeAction(
    {
      action: body.action,
      input: body.input,
    },
    {
      request,
    },
  );

  const status =
    result.status === "unknown"
      ? 404
      : result.status === "blocked"
        ? 403
        : 200;

  return NextResponse.json(result, { status });
}
