export type ActionId =
  | "estado"
  | "preparar"
  | "verificar"
  | "planificar_instalacion"
  | "descargar_instalador"
  | "instalar";

export type ActionDefinition = {
  id: ActionId;
  description: string;
  requiresConfirmation: boolean;
  executesExternalChange: boolean;
  enabled: boolean;
};

export const ACTIONS: ActionDefinition[] = [
  {
    id: "estado",
    description: "Consultar el estado actual del sistema.",
    requiresConfirmation: false,
    executesExternalChange: false,
    enabled: true,
  },
  {
    id: "preparar",
    description: "Preparar la infraestructura de trabajo.",
    requiresConfirmation: false,
    executesExternalChange: false,
    enabled: true,
  },
  {
    id: "verificar",
    description: "Verificar herramientas y condiciones del entorno.",
    requiresConfirmation: false,
    executesExternalChange: false,
    enabled: true,
  },
  {
    id: "planificar_instalacion",
    description: "Crear un plan de instalación sin ejecutar cambios.",
    requiresConfirmation: false,
    executesExternalChange: false,
    enabled: true,
  },
  {
    id: "descargar_instalador",
    description: "Descargar y verificar un instalador permitido.",
    requiresConfirmation: false,
    executesExternalChange: true,
    enabled: false,
  },
  {
    id: "instalar",
    description: "Ejecutar una instalación previamente autorizada.",
    requiresConfirmation: true,
    executesExternalChange: true,
    enabled: false,
  },
];

export function getAction(actionId: string): ActionDefinition | undefined {
  return ACTIONS.find((action) => action.id === actionId);
}

export function listActions(): ActionDefinition[] {
  return ACTIONS;
}
