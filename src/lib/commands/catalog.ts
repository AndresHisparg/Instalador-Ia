export type CommandId =
  | "estado"
  | "preparar"
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
    description: "Verifica el estado del entorno y sus herramientas.",
    method: "GET",
    requiresConfirmation: false,
  },
  {
    id: "preparar",
    description: "Prepara la estructura de trabajo del instalador.",
    method: "POST",
    requiresConfirmation: false,
  },
  {
    id: "comandos",
    description: "Muestra los comandos disponibles.",
    method: "GET",
    requiresConfirmation: false,
  },
];

export function getCommand(commandId: string): CommandDefinition | undefined {
  return COMMANDS.find((command) => command.id === commandId);
}
