import { NextRequest } from "next/server";
import { ACTIONS, getAction } from "./catalog";
import { authorizeAction } from "@/lib/security/policy";
import { getSystemStatus } from "@/lib/core/system";
import { prepareSystem } from "@/lib/core/preparation";
import { verifySystem } from "@/lib/core/verification";
import { planInstallation } from "@/lib/core/installation-plan";

export type ActionRequest = {
  action: string;
  input?: Record<string, unknown>;
  request?: NextRequest;
  source?: "system" | "user" | "gpt" | "api";
  confirmed?: boolean;
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

  const authorization = authorizeAction({
    action: request.action,
    source: request.source ?? "system",
    confirmed: request.confirmed,
  });

  if (!authorization.allowed) {
    return {
      success: false,
      action: request.action,
      status: "blocked",
      error: authorization.reason,
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
): Promise<ActionResult> {
  const validation = validateAction(request);

  if (validation) {
    return validation;
  }

  switch (request.action) {
    case "estado":
      return {
        success: true,
        action: request.action,
        status: "completed",
        result: getSystemStatus(),
      };

    case "preparar":
      return {
        success: true,
        action: request.action,
        status: "completed",
        result: prepareSystem(),
      };

    case "verificar":
      return {
        success: true,
        action: request.action,
        status: "completed",
        result: verifySystem(),
      };

    case "planificar_instalacion":
      return {
        success: true,
        action: request.action,
        status: "completed",
        result: planInstallation(),
      };

    default:
      return {
        success: true,
        action: request.action,
        status: "completed",
        result: {
          message:
            "Acción validada y ejecutada por el motor central.",
        },
      };
  }
}
