import { ACTIONS, getAction } from "./catalog";

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
