import {
  executeAction,
  type ActionResult,
} from "@/lib/actions/engine";

export const gptTools = [
  {
    type: "function" as const,
    name: "get_system_status",
    description:
      "Consulta el estado actual del sistema.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "prepare_system",
    description:
      "Prepara la infraestructura de trabajo utilizando el flujo controlado existente.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "verify_system",
    description:
      "Verifica las herramientas y condiciones actuales del entorno.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "plan_installation",
    description:
      "Genera un plan de instalación sin ejecutar cambios en el sistema.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },
];

export async function executeGptTool(
  name: string,
): Promise<ActionResult> {
  switch (name) {
    case "get_system_status":
      return executeAction({
        action: "estado",
        source: "gpt",
      });

    case "prepare_system":
      return executeAction({
        action: "preparar",
        source: "gpt",
      });

    case "verify_system":
      return executeAction({
        action: "verificar",
        source: "gpt",
      });

    case "plan_installation":
      return executeAction({
        action: "planificar_instalacion",
        source: "gpt",
      });

    default:
      return {
        success: false,
        action: name,
        status: "unknown",
        error: "Herramienta GPT no reconocida.",
      };
  }
}
