import { NextResponse } from "next/server";

import {
  detectComponents,
  getComponentRegistry,
} from "@/lib/core/component-registry";

import {
  getInstallerRegistry,
} from "@/lib/core/installer-registry";

export async function GET() {
  const components = getComponentRegistry();
  const checks = await detectComponents();
  const registry = getInstallerRegistry();

  const plan = checks.map((check) => {
    const installer = registry.find(
      (item) => item.componentId === check.id,
    );

    if (check.installed) {
      return {
        componentId: check.id,
        componentName: check.name,
        required: check.required,
        status: "installed",
        version: check.version,
        action: "none",
        installerAvailable: installer?.enabled ?? false,
        requiresAdministrator:
          installer?.requiresAdministrator ?? false,
        installerType: installer?.installerType ?? null,
        provider: installer?.provider ?? null,
      };
    }

    if (!installer) {
      return {
        componentId: check.id,
        componentName: check.name,
        required: check.required,
        status: "missing",
        version: null,
        action: "unavailable",
        installerAvailable: false,
        requiresAdministrator: false,
        installerType: null,
        provider: null,
      };
    }

    if (!installer.enabled) {
      return {
        componentId: check.id,
        componentName: check.name,
        required: check.required,
        status: "missing",
        version: null,
        action: "pending-installer",
        installerAvailable: false,
        requiresAdministrator:
          installer.requiresAdministrator,
        installerType: installer.installerType,
        provider: installer.provider,
      };
    }

    return {
      componentId: check.id,
      componentName: check.name,
      required: check.required,
      status: "missing",
      version: null,
      action: "install",
      installerAvailable: true,
      requiresAdministrator:
        installer.requiresAdministrator,
      installerType: installer.installerType,
      provider: installer.provider,
    };
  });

  const missingComponents = plan.filter(
    (item) => item.status === "missing",
  );

  const installableComponents = plan.filter(
    (item) => item.action === "install",
  );

  const ready = missingComponents.length === 0;

  return NextResponse.json({
    success: true,
    ready,
    plannedAt: new Date().toISOString(),
    totalComponents: components.length,
    missingComponents: missingComponents.length,
    installableComponents: installableComponents.length,
    registryCount: registry.length,
    plan,
  });
}