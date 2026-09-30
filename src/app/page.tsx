"use client";

import { useState } from "react";

type SystemInfo = {
  platform: string;
  architecture: string;
  nodeVersion: string;
  npmVersion: string | null;
  gitVersion: string | null;
  cpuCores: number;
  totalMemoryGB: number;
  freeMemoryGB: number;
  diskTotalGB: number | null;
  diskFreeGB: number | null;
  hostname: string;
};

type CheckStatus = "ok" | "warning" | "error";

type Check = {
  name: string;
  value: string;
  status: CheckStatus;
};

function getStatusIcon(status: CheckStatus) {
  if (status === "ok") return "✓";
  if (status === "warning") return "⚠";
  return "✕";
}

function SystemCheck({
  name,
  value,
  status,
}: Check) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
            status === "ok"
              ? "bg-emerald-500/15 text-emerald-400"
              : status === "warning"
                ? "bg-yellow-500/15 text-yellow-400"
                : "bg-red-500/15 text-red-400"
          }`}
        >
          {getStatusIcon(status)}
        </div>

        <span className="text-gray-300">{name}</span>
      </div>

      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startInstallation() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/system");

      if (!response.ok) {
        throw new Error("No se pudo analizar el sistema.");
      }

      const data: SystemInfo = await response.json();

      setSystem(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function startPreparation() {
    setPreparing(true);
    setError(null);

    try {
      const response = await fetch("/api/prepare", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("No se pudo preparar el entorno.");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message ?? "La preparación no se completó correctamente."
        );
      }

      setPrepared(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error durante la preparación."
      );
    } finally {
      setPreparing(false);
    }
  }

  const checks: Check[] = system
    ? [
        {
          name: "Sistema operativo",
          value: system.platform === "win32" ? "Windows" : system.platform,
          status: system.platform === "win32" ? "ok" : "error",
        },
        {
          name: "Arquitectura",
          value: system.architecture,
          status: system.architecture === "x64" ? "ok" : "warning",
        },
        {
          name: "Node.js",
          value: system.nodeVersion,
          status: "ok",
        },
        {
          name: "npm",
          value: system.npmVersion ?? "No encontrado",
          status: system.npmVersion ? "ok" : "error",
        },
        {
          name: "Git",
          value: system.gitVersion ?? "No encontrado",
          status: system.gitVersion ? "ok" : "error",
        },
        {
          name: "Procesador",
          value: `${system.cpuCores} núcleos`,
          status: system.cpuCores >= 4 ? "ok" : "warning",
        },
        {
          name: "Memoria RAM",
          value: `${system.freeMemoryGB} GB disponibles`,
          status: system.freeMemoryGB >= 4 ? "ok" : "warning",
        },
        {
          name: "Espacio en disco",
          value:
            system.diskFreeGB !== null
              ? `${system.diskFreeGB} GB disponibles`
              : "No disponible",
          status:
            system.diskFreeGB === null
              ? "warning"
              : system.diskFreeGB >= 20
                ? "ok"
                : "warning",
        },
      ]
    : [];

  const systemReady =
    system !== null &&
    checks.every((check) => check.status === "ok");

  return (
    <main className="min-h-screen bg-[#070b14] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col justify-center">
        {!system ? (
          <section className="text-center">
            <div className="mb-8 inline-flex rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-2 text-sm text-blue-300">
              INSTALADOR-IA
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Tu asistente inteligente,
              <br />
              <span className="text-blue-400">
                listo para instalar.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Analizaremos tu equipo para comprobar que todo esté
              preparado antes de comenzar la instalación.
            </p>

            <button
              onClick={startInstallation}
              disabled={loading}
              className="mt-10 rounded-xl bg-blue-500 px-8 py-4 text-lg font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Analizando tu equipo..."
                : "Comenzar instalación"}
            </button>

            {error && (
              <p className="mx-auto mt-6 max-w-lg rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                {error}
              </p>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-10 text-center">
              <div className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
                INSTALADOR-IA
              </div>

              <h1 className="text-4xl font-bold sm:text-5xl">
                Comprobación del sistema
              </h1>

              <p className="mt-4 text-gray-400">
                Hemos analizado el equipo{" "}
                <span className="font-medium text-gray-200">
                  {system.hostname}
                </span>
                .
              </p>
            </div>

            <div className="space-y-3">
              {checks.map((check) => (
                <SystemCheck
                  key={check.name}
                  name={check.name}
                  value={check.value}
                  status={check.status}
                />
              ))}
            </div>

            <div
              className={`mt-8 rounded-2xl border p-6 text-center ${
                systemReady
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-yellow-500/20 bg-yellow-500/10"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  systemReady
                    ? "text-emerald-400"
                    : "text-yellow-400"
                }`}
              >
                {systemReady
                  ? "✓ SISTEMA PREPARADO"
                  : "⚠ REQUIERE ATENCIÓN"}
              </div>

              <p className="mt-2 text-gray-400">
                {systemReady
                  ? "Tu equipo cumple los requisitos para continuar."
                  : "Hay requisitos que debemos revisar antes de continuar."}
              </p>
            </div>

            {prepared && (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                <div className="text-xl font-bold text-emerald-400">
                  ✓ PREPARACIÓN COMPLETADA
                </div>

                <p className="mt-2 text-gray-400">
                  El entorno de trabajo ha sido preparado correctamente.
                </p>
              </div>
            )}

            {error && (
              <p className="mx-auto mt-6 max-w-lg rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-300">
                {error}
              </p>
            )}

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => {
                  setSystem(null);
                  setPrepared(false);
                  setError(null);
                }}
                className="rounded-xl border border-white/10 px-6 py-3 font-medium text-gray-300 transition hover:bg-white/5"
              >
                Volver
              </button>

              {systemReady && (
                <button
                  onClick={startPreparation}
                  disabled={preparing || prepared}
                  className="rounded-xl bg-blue-500 px-8 py-3 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {preparing
                    ? "Preparando..."
                    : prepared
                      ? "Preparación completada"
                      : "Continuar"}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}