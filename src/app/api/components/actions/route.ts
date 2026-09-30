import { NextResponse } from "next/server";

type ComponentAction = {
  id: string;
  name: string;
  description: string;
  available: boolean;
};

type ComponentActions = {
  componentId: string;
  componentName: string;
  actions: ComponentAction[];
};

const COMPONENT_ACTIONS: ComponentActions[] = [
  {
    componentId: "node",
    componentName: "Node.js",
    actions: [
      {
        id: "detect",
        name: "Detectar",
        description: "Comprobar si Node.js está instalado.",
        available: true,
      },
      {
        id: "install",
        name: "Instalar",
        description: "Instalar Node.js en el sistema.",
        available: false,
      },
      {
        id: "verify",
        name: "Verificar",
        description: "Verificar que Node.js funciona correctamente.",
        available: true,
      },
    ],
  },
  {
    componentId: "npm",
    componentName: "npm",
    actions: [
      {
        id: "detect",
        name: "Detectar",
        description: "Comprobar si npm está instalado.",
        available: true,
      },
      {
        id: "install",
        name: "Instalar",
        description: "Instalar npm mediante Node.js.",
        available: false,
      },
      {
        id: "verify",
        name: "Verificar",
        description: "Verificar que npm funciona correctamente.",
        available: true,
      },
    ],
  },
  {
    componentId: "git",
    componentName: "Git",
    actions: [
      {
        id: "detect",
        name: "Detectar",
        description: "Comprobar si Git está instalado.",
        available: true,
      },
      {
        id: "install",
        name: "Instalar",
        description: "Instalar Git en el sistema.",
        available: false,
      },
      {
        id: "verify",
        name: "Verificar",
        description: "Verificar que Git funciona correctamente.",
        available: true,
      },
    ],
  },
  {
    componentId: "powershell",
    componentName: "PowerShell",
    actions: [
      {
        id: "detect",
        name: "Detectar",
        description: "Comprobar si PowerShell está disponible.",
        available: true,
      },
      {
        id: "install",
        name: "Instalar",
        description: "Gestionar la instalación de PowerShell.",
        available: false,
      },
      {
        id: "verify",
        name: "Verificar",
        description: "Verificar que PowerShell funciona correctamente.",
        available: true,
      },
    ],
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: COMPONENT_ACTIONS.length,
    actions: COMPONENT_ACTIONS,
  });
}