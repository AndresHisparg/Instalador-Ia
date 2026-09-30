export type CommandId =
  | "estado"
  | "preparar"
  | "verificar"
  | "planificar_instalacion"
  | "comandos";

export type CommandDefinition = {
  id: CommandId;
  description: string;
  method: "GET" | "POST";
  requiresConfirmation: boolean;
};

export const COMMANDS: CommandDefinition[] = [
  {
    id: "estado",
    description: "Consultar el estado actual del sistema.",
    method: "POST",
    requiresConfirmation: false,
  },
  {
    id: "preparar",
    description: "Preparar la infraestructura de trabajo.",
    method: "POST",
    requiresConfirmation: false,
  },
  {
    id: "verificar",
    description: "Verificar herramientas y condiciones del entorno.",
    method: "POST",
    requiresConfirmation: false,
  },
  {
    id: "planificar_instalacion",
    description: "Crear un plan de instalación sin ejecutar cambios.",
    method: "POST",
    requiresConfirmation: false,
  },
  {
    id: "comandos",
    description: "Consultar los comandos disponibles.",
    method: "GET",
    requiresConfirmation: false,
  },
];

export function getCommand(commandId: string) {
  return COMMANDS.find((command) => command.id === commandId);
}

export function listCommands() {
  return COMMANDS;
}

export function commandToAction(commandId: string) {
  switch (commandId) {
    case "estado":
      return "estado";
    case "preparar":
      return "preparar";
    case "verificar":
      return "verificar";
    case "planificar_instalacion":
      return "planificar_instalacion";
    default:
      return null;
  }
}
