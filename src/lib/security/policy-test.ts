import {
  authorizeAction,
} from "./policy";

type PolicyTest = {
  name: string;
  expected: boolean;
  actual: boolean;
};

const tests: PolicyTest[] = [
  {
    name: "Estado permitido para GPT",
    expected: true,
    actual: authorizeAction({
      action: "estado",
      source: "gpt",
    }).allowed,
  },
  {
    name: "Accion inexistente denegada",
    expected: false,
    actual: authorizeAction({
      action: "accion_inexistente",
      source: "gpt",
    }).allowed,
  },
  {
    name: "Preparar puede escribir en workspace",
    expected: true,
    actual: authorizeAction({
      action: "preparar",
      permission: "filesystem_write",
      resource: "workspace",
      source: "gpt",
    }).allowed,
  },
  {
    name: "Preparar no puede escribir en git_installer",
    expected: false,
    actual: authorizeAction({
      action: "preparar",
      permission: "filesystem_write",
      resource: "git_installer",
      source: "gpt",
    }).allowed,
  },
  {
    name: "Verificar no puede escribir",
    expected: false,
    actual: authorizeAction({
      action: "verificar",
      permission: "filesystem_write",
      resource: "workspace",
      source: "gpt",
    }).allowed,
  },
  {
    name: "Verificar puede leer workspace",
    expected: true,
    actual: authorizeAction({
      action: "verificar",
      permission: "filesystem_read",
      resource: "workspace",
      source: "gpt",
    }).allowed,
  },
  {
    name: "GPT no puede usar process sin autorizacion",
    expected: false,
    actual: authorizeAction({
      action: "verificar",
      permission: "process",
      source: "gpt",
    }).allowed,
  },
];

let failures = 0;

for (const test of tests) {
  const passed = test.actual === test.expected;

  console.log(
    `${passed ? "OK" : "ERROR"} - ${test.name}`,
  );

  if (!passed) {
    failures++;
  }
}

if (failures > 0) {
  throw new Error(
    `${failures} prueba(s) de seguridad fallaron.`,
  );
}

console.log(
  `Todas las pruebas de seguridad pasaron: ${tests.length}/${tests.length}`,
);
