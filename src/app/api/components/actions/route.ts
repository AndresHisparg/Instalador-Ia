import { NextResponse } from "next/server";

import {
  getComponentRegistry,
} from "@/lib/core/component-registry";

type ComponentAction = {
  componentId: string;
  componentName: string;
  detect: boolean;
  install: boolean;
  verify: boolean;
};

export async function GET() {
  const components = getComponentRegistry();

  const actions: ComponentAction[] = components.map(
    (component) => ({
      componentId: component.id,
      componentName: component.name,
      detect: true,
      install: false,
      verify: true,
    }),
  );

  return NextResponse.json({
    success: true,
    count: actions.length,
    actions,
  });
}