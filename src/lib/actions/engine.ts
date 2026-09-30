import { NextRequest } from "next/server";
import { ACTIONS, getAction } from "./catalog";
import { getSystemStatus } from "@/lib/core/system";
import { prepareSystem } from "@/lib/core/preparation";

export type ActionRequest = {
  action: string;
  input?: Record<string, unknown>;
};

export type ActionResult = {
  success: boolean;
  action: string;
  status: "completed" | "blocked" | "unknown";
  result?: unknown;
  error?: string;
};

export function validateAction(
  request: ActionRequest,
): ActionResult | null {
  const action = getAction(request.action);

  if (!action) {
    return {
      success: false,
      action: request.action,
      status: "unknown",
      error: "Acción no reconocida.",
    };
  }

  if (!action.enabled) {
    return {
      success: false,
      action: request.action,
      status: "blocked",
      error: "La acción existe pero está deshabilitada.",
    };
  }

  return null;
}

export function getActionCatalog() {
  return {
    success: true,
    actions: ACTIONS,
  };
}

export async function executeAction(
  request: ActionRequest,
  context?: {
    request?: NextRequest;
  },
): Promise<ActionResult> {
  const blocked = validateAction(request);

  if (blocked) {
    return blocked;
  }

  switch (request.action) {
    case "estado": {
      const result = await getSystemStatus();

      return {
        success: result.success,
        action: "estado",
        status: result.success ? "completed" : "blocked",
        result: result.data,
      };
    }

    case "preparar": {
      if (!context?.request) {
        return {
          success: false,
          action: "preparar",
          status: "blocked",
          error: "La acción preparar requiere contexto HTTP.",
        };
      }

      const result = await prepareSystem(context.request);

      return {
        success: result.success,
        action: "preparar",
        status: result.success ? "completed" : "blocked",
        result: result.data,
      };
    }

    default:
      return {
        success: true,
        action: request.action,
        status: "completed",
        result: {
          message:
            "Acción validada. Su implementación se conectará posteriormente.",
          input: request.input ?? {},
        },
      };
  }
}
