import path from "node:path";

export type ResourceId =
  | "workspace"
  | "node_installer"
  | "git_installer";

export type ResourceDefinition = {
  id: ResourceId;
  description: string;
  relativePath: string;
  allowRead: boolean;
  allowWrite: boolean;
};

const RESOURCE_ROOT = path.resolve(
  process.cwd(),
  "workspace",
);

export const RESOURCES: ResourceDefinition[] = [
  {
    id: "workspace",
    description:
      "Espacio de trabajo controlado por la aplicacion.",
    relativePath: ".",
    allowRead: true,
    allowWrite: true,
  },

  {
    id: "node_installer",
    description:
      "Ubicacion controlada para recursos del instalador de Node.js.",
    relativePath: "installers/node",
    allowRead: true,
    allowWrite: true,
  },

  {
    id: "git_installer",
    description:
      "Ubicacion controlada para recursos del instalador de Git.",
    relativePath: "installers/git",
    allowRead: true,
    allowWrite: true,
  },
];

export function getResource(
  resourceId: ResourceId,
): ResourceDefinition | undefined {
  return RESOURCES.find(
    (resource) => resource.id === resourceId,
  );
}

/**
 * Resuelve un recurso logico a una ruta controlada
 * por la aplicacion.
 *
 * No acepta rutas arbitrarias.
 */
export function resolveResource(
  resourceId: ResourceId,
): string | undefined {
  const resource = getResource(resourceId);

  if (!resource) {
    return undefined;
  }

  const resolvedPath = path.resolve(
    RESOURCE_ROOT,
    resource.relativePath,
  );

  if (
    resolvedPath !== RESOURCE_ROOT &&
    !resolvedPath.startsWith(
      `${RESOURCE_ROOT}${path.sep}`,
    )
  ) {
    return undefined;
  }

  return resolvedPath;
}
