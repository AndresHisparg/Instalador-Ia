import { NextRequest, NextResponse } from "next/server";
import { COMMANDS, getCommand } from "@/lib/commands/catalog";
import { GET as verifyEnvironment } from "../verify/route";
import { POST as prepareEnvironment } from "../prepare/route";

function jsonResponse(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest) {
  const commandId = request.nextUrl.searchParams.get("command");

  if (!commandId) {
    return jsonResponse({
      success: true,
      service: "instalador-ia-command-layer",
      commands: COMMANDS,
    });
  }

  if (commandId === "comandos") {
    return jsonResponse({
      success: true,
      command: "comandos",
      commands: COMMANDS,
    });
  }

  if (commandId === "estado") {
    const response = await verifyEnvironment();
    const data = await response.json();

    return jsonResponse({
      success: response.ok,
      command: "estado",
      result: data,
    }, response.status);
  }

  const command = getCommand(commandId);

  if (!command) {
    return jsonResponse({
      success: false,
      error: "Comando no reconocido.",
      command: commandId,
      availableCommands: COMMANDS.map((item) => item.id),
    }, 404);
  }

  return jsonResponse({
    success: false,
    error: `El comando "${commandId}" requiere POST.`,
  }, 405);
}

export async function POST(request: NextRequest) {
  let body: { command?: string } = {};

  try {
    body = await request.json();
  } catch {
    return jsonResponse({
      success: false,
      error: "El cuerpo debe ser JSON.",
    }, 400);
  }

  const commandId = body.command;

  if (!commandId) {
    return jsonResponse({
      success: false,
      error: "Falta el campo command.",
      availableCommands: COMMANDS.map((item) => item.id),
    }, 400);
  }

  if (commandId === "preparar") {
    const response = await prepareEnvironment(request);
    const data = await response.json();

    return jsonResponse({
      success: response.ok,
      command: "preparar",
      result: data,
    }, response.status);
  }

  const command = getCommand(commandId);

  if (!command) {
    return jsonResponse({
      success: false,
      error: "Comando no reconocido.",
      command: commandId,
      availableCommands: COMMANDS.map((item) => item.id),
    }, 404);
  }

  return jsonResponse({
    success: false,
    error: `El comando "${commandId}" no admite POST.`,
  }, 405);
}
