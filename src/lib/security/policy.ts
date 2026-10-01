import {
  getResource,
  type ResourceId,
} from "./resource-registry";

export type SecurityPermission =
  | "filesystem_read"
  | "filesystem_write"
  | "network"
  | "process"
  | "administrator";

export type SecurityResource =
  | "workspace"
  | "node_installer"
  | "git_installer";

export type SecurityPolicy = {
  action: string;
  enabled: boolean;
  gptAllowed: boolean;
  requiresConfirmation: boolean;
  permissions: SecurityPermission[];
  resources: SecurityResource[];
};

export type AuthorizationRequest = {
  action: string;
  permission?: SecurityPermission;
  resource?: SecurityResource;
  source?: "system" | "user" | "gpt" | "api";
  confirmed?: boolean;
};

export type AuthorizationResult = {
  allowed: boolean;
  reason: string;
};

export const SECURITY_POLICIES: SecurityPolicy[] = [
  {
    action: "estado",
    enabled: true,
    gptAllowed: true,
    requiresConfirmation: false,
    permissions: [],
    resources: [],
  },

  {
    action: "preparar",
    enabled: true,
    gptAllowed: true,
    requiresConfirmation: false,
    permissions: ["filesystem_write"],
    resources: ["workspace"],
  },

  {
    action: "verificar",
    enabled: true,
    gptAllowed: true,
    requiresConfirmation: false,
    permissions: ["filesystem_read"],
    resources: ["workspace"],
  },

  {
    action: "planificar_instalacion",
    enabled: true,
    gptAllowed: true,
    requiresConfirmation: false,
    permissions: ["filesystem_read"],
    resources: ["workspace"],
  },
];

export function getSecurityPolicy(
  action: string,
): SecurityPolicy | undefined {
  return SECURITY_POLICIES.find(
    (policy) => policy.action === action,
  );
}

export function isActionAllowed(
  action: string,
): boolean {
  const policy = getSecurityPolicy(action);

  return Boolean(policy?.enabled);
}

export function isGptActionAllowed(
  action: string,
): boolean {
  const policy = getSecurityPolicy(action);

  return Boolean(
    policy?.enabled && policy.gptAllowed,
  );
}

export function hasPermission(
  action: string,
  permission: SecurityPermission,
): boolean {
  const policy = getSecurityPolicy(action);

  return Boolean(
    policy?.permissions.includes(permission),
  );
}

export function hasResourceAccess(
  action: string,
  resource: SecurityResource,
): boolean {
  const policy = getSecurityPolicy(action);

  return Boolean(
    policy?.resources.includes(resource),
  );
}

function isPermissionCompatibleWithResource(
  permission: SecurityPermission,
  resource: SecurityResource,
): boolean {
  const definition = getResource(resource as ResourceId);

  if (!definition) {
    return false;
  }

  switch (permission) {
    case "filesystem_read":
      return definition.allowRead;

    case "filesystem_write":
      return definition.allowWrite;

    default:
      return true;
  }
}

function validatePolicyResources(
  policy: SecurityPolicy,
): AuthorizationResult | null {
  for (const resource of policy.resources) {
    const definition = getResource(
      resource as ResourceId,
    );

    if (!definition) {
      return {
        allowed: false,
        reason:
          `El recurso "${resource}" no existe en el registro de recursos.`,
      };
    }

    for (const permission of policy.permissions) {
      if (
        (permission === "filesystem_read" ||
          permission === "filesystem_write") &&
        !isPermissionCompatibleWithResource(
          permission,
          resource,
        )
      ) {
        return {
          allowed: false,
          reason:
            `El recurso "${resource}" no admite el permiso "${permission}".`,
        };
      }
    }
  }

  return null;
}

/**
 * Punto central de autorizacion.
 *
 * Deniega por defecto.
 *
 * Esta funcion no confia en GPT ni en el usuario.
 * La autorizacion procede exclusivamente de las
 * politicas declaradas por la aplicacion.
 */
export function authorizeAction(
  request: AuthorizationRequest,
): AuthorizationResult {
  const policy = getSecurityPolicy(request.action);

  if (!policy) {
    return {
      allowed: false,
      reason:
        "La accion no tiene una politica de seguridad.",
    };
  }

  if (!policy.enabled) {
    return {
      allowed: false,
      reason:
        "La accion esta deshabilitada.",
    };
  }

  const resourceValidation =
    validatePolicyResources(policy);

  if (resourceValidation) {
    return resourceValidation;
  }

  if (
    request.source === "gpt" &&
    !policy.gptAllowed
  ) {
    return {
      allowed: false,
      reason:
        "La accion no esta autorizada para GPT.",
    };
  }

  if (
    policy.requiresConfirmation &&
    request.confirmed !== true
  ) {
    return {
      allowed: false,
      reason:
        "La accion requiere confirmacion explicita.",
    };
  }

  if (
    request.permission &&
    !policy.permissions.includes(
      request.permission,
    )
  ) {
    return {
      allowed: false,
      reason:
        "El permiso solicitado no esta autorizado para la accion.",
    };
  }

  if (
    request.resource &&
    !policy.resources.includes(
      request.resource,
    )
  ) {
    return {
      allowed: false,
      reason:
        "El recurso solicitado no esta autorizado para la accion.",
    };
  }

  if (
    request.permission &&
    request.resource &&
    (request.permission === "filesystem_read" ||
      request.permission === "filesystem_write") &&
    !isPermissionCompatibleWithResource(
      request.permission,
      request.resource,
    )
  ) {
    return {
      allowed: false,
      reason:
        "El recurso no admite el permiso solicitado.",
    };
  }

  return {
    allowed: true,
    reason:
      "La accion esta autorizada por la politica.",
  };
}
