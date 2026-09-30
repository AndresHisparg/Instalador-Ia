import { NextRequest, NextResponse } from "next/server";
import {
  commandToAction,
  getCommand,
  listCommands,
} from "@/lib/commands/catalog";
import {
  executeAction,
  getActionCatalog,
} from "@/lib/actions/engine";

export async function GET() {
  return NextResponse.json({
    success: true,
    commands: listCommands(),
    actions: getActionCatalog().actions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const command =
      typeof body?.command === "string" ? body.command : "";

    if (command === "comandos") {
      return NextResponse.json({
        success: true,
        command,
        status: "completed",
        result: {
          commands: listCommands(),
          actions: getActionCatalog().actions,
        },
      });
    }

    const definition = getCommand(command);

    if (!definition) {
      return NextResponse.json(
        {
          success: false,
          command,
          status: "unknown",
          error: "Comando no reconocido.",
        },
        { status: 400 }
      );
    }

    const action = commandToAction(command);

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          command,
          status: "blocked",
          error: "El comando no tiene una acción asociada.",
        },
        { status: 403 }
      );
    }

    const result = await executeAction({
      action,
      input:
        body?.input && typeof body.input === "object"
          ? body.input
          : undefined,
      request,
    });

    return NextResponse.json({
      ...result,
      command,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: "blocked",
        error:
          error instanceof Error
            ? error.message
            : "Error procesando el comando.",
      },
      { status: 500 }
    );
  }
}
