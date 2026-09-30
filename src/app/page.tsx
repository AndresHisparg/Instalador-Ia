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

type ToolInfo = {
  installed: boolean;
  version: string | null;
};

type PreparationResult = {
  success: boolean;
  message: string;
  created: string[];
  existing: string[];
  tools: {
    node: ToolInfo;
    npm: ToolInfo;
    git: ToolInfo;
    powershell: ToolInfo;
  };
};

export default function Home() {
  const [state, setState] = useState<
    "initial" | "loading" | "system" | "preparing" | "prepared" | "error"
  >("initial");

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [preparationResult, setPreparationResult] =
    useState<PreparationResult | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  async function startInstallation() {
    setState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/system");

      if (!response.ok) {
        throw new Error("No se pudo obtener la información del sistema.");
      }

      const data: SystemInfo = await response.json();

      setSystemInfo(data);
      setState("system");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Se produjo un error desconocido."
      );
      setState("error");
    }
  }

  async function startPreparation() {
    setState("preparing");
    setErrorMessage("");

    try {
      const response = await fetch("/api/prepare", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("No se pudo preparar el entorno.");
      }

      const data: PreparationResult = await response.json();

      setPreparationResult(data);
      setState("prepared");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Se produjo un error durante la preparación."
      );
      setState("error");
    }
  }

  function resetInstallation() {
    setState("initial");
    setSystemInfo(null);
    setPreparationResult(null);
    setErrorMessage("");
  }

  const systemReady =
    systemInfo &&
    systemInfo.platform === "win32" &&
    systemInfo.architecture === "x64" &&
    !!systemInfo.nodeVersion &&
    !!systemInfo.npmVersion &&
    !!systemInfo.gitVersion;

  function getToolName(name: string) {
    switch (name) {
      case "node":
        return "Node.js";
      case "npm":
        return "npm";
      case "git":
        return "Git";
      case "powershell":
        return "PowerShell";
      default:
        return name;
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          background: "#111827",
          border: "1px solid #334155",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "35px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "38px",
              letterSpacing: "2px",
              color: "#f8fafc",
            }}
          >
            INSTALADOR-IA
          </h1>

          <p
            style={{
              marginTop: "12px",
              color: "#94a3b8",
              fontSize: "16px",
            }}
          >
            Preparación automática del entorno
          </p>
        </div>

        {state === "initial" && (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.7,
                marginBottom: "30px",
              }}
            >
              Este asistente comprobará el sistema y preparará el entorno
              necesario para Instalador-IA.
            </p>

            <button
              onClick={startInstallation}
              style={{
                padding: "14px 28px",
                borderRadius: "8px",
                border: "none",
                background: "#2563eb",
                color: "white",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Comenzar instalación
            </button>
          </div>
        )}

        {state === "loading" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "18px" }}>Analizando el sistema...</p>
          </div>
        )}

        {state === "system" && systemInfo && (
          <div>
            <h2
              style={{
                marginTop: 0,
                marginBottom: "25px",
                color: "#f8fafc",
              }}
            >
              Diagnóstico del sistema
            </h2>

            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              <SystemCheck
                label="Windows"
                value={systemInfo.platform === "win32"}
                detail={systemInfo.platform}
              />

              <SystemCheck
                label="Arquitectura x64"
                value={systemInfo.architecture === "x64"}
                detail={systemInfo.architecture}
              />

              <SystemCheck
                label="Node.js"
                value={!!systemInfo.nodeVersion}
                detail={systemInfo.nodeVersion}
              />

              <SystemCheck
                label="npm"
                value={!!systemInfo.npmVersion}
                detail={systemInfo.npmVersion ?? "No detectado"}
              />

              <SystemCheck
                label="Git"
                value={!!systemInfo.gitVersion}
                detail={systemInfo.gitVersion ?? "No detectado"}
              />

              <SystemCheck
                label="CPU"
                value={systemInfo.cpuCores >= 2}
                detail={`${systemInfo.cpuCores} núcleos`}
              />

              <SystemCheck
                label="RAM"
                value={systemInfo.totalMemoryGB >= 4}
                detail={`${systemInfo.totalMemoryGB} GB`}
              />

              <SystemCheck
                label="Disco C:"
                value={
                  systemInfo.diskFreeGB === null ||
                  systemInfo.diskFreeGB >= 10
                }
                detail={
                  systemInfo.diskFreeGB === null
                    ? "No disponible"
                    : `${systemInfo.diskFreeGB} GB libres de ${systemInfo.diskTotalGB} GB`
                }
              />
            </div>

            <div
              style={{
                marginTop: "30px",
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={resetInstallation}
                style={{
                  padding: "12px 22px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  background: "transparent",
                  color: "#cbd5e1",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Volver
              </button>

              <button
                onClick={startPreparation}
                disabled={!systemReady}
                style={{
                  padding: "12px 22px",
                  borderRadius: "8px",
                  border: "none",
                  background: systemReady ? "#2563eb" : "#475569",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: systemReady ? "pointer" : "not-allowed",
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {state === "preparing" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "42px",
                marginBottom: "20px",
              }}
            >
              ⚙
            </div>

            <h2 style={{ marginBottom: "10px" }}>
              Preparando entorno...
            </h2>

            <p style={{ color: "#94a3b8" }}>
              Creando directorios y detectando herramientas.
            </p>
          </div>
        )}

        {state === "prepared" && preparationResult && (
          <div>
            <div
              style={{
                padding: "20px",
                borderRadius: "10px",
                background: "#052e16",
                border: "1px solid #166534",
                marginBottom: "25px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom: "8px",
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  margin: 0,
                  color: "#86efac",
                }}
              >
                PREPARACIÓN COMPLETADA
              </h2>

              <p
                style={{
                  color: "#bbf7d0",
                  marginBottom: 0,
                }}
              >
                {preparationResult.message}
              </p>
            </div>

            <div>
              <h3
                style={{
                  marginBottom: "15px",
                  color: "#f8fafc",
                }}
              >
                Herramientas detectadas
              </h3>

              <div
                style={{
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {Object.entries(preparationResult.tools).map(
                  ([name, tool], index) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "20px",
                        padding: "14px 16px",
                        borderBottom:
                          index <
                          Object.entries(preparationResult.tools).length - 1
                            ? "1px solid #334155"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            color: tool.installed ? "#4ade80" : "#f87171",
                            fontWeight: "bold",
                            fontSize: "18px",
                          }}
                        >
                          {tool.installed ? "✓" : "✗"}
                        </span>

                        <span>{getToolName(name)}</span>
                      </div>

                      <span
                        style={{
                          color: "#94a3b8",
                          fontSize: "14px",
                          textAlign: "right",
                          wordBreak: "break-word",
                        }}
                      >
                        {tool.version ?? "No detectado"}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "30px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={resetInstallation}
                style={{
                  padding: "12px 22px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  background: "transparent",
                  color: "#cbd5e1",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div>
            <div
              style={{
                padding: "20px",
                borderRadius: "10px",
                background: "#450a0a",
                border: "1px solid #991b1b",
                marginBottom: "25px",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  color: "#fca5a5",
                }}
              >
                Error
              </h2>

              <p
                style={{
                  color: "#fecaca",
                  marginBottom: 0,
                }}
              >
                {errorMessage}
              </p>
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={resetInstallation}
                style={{
                  padding: "12px 22px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Volver a intentar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SystemCheck({
  label,
  value,
  detail,
}: {
  label: string;
  value: boolean;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        padding: "12px 14px",
        borderRadius: "8px",
        background: "#1e293b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span
          style={{
            color: value ? "#4ade80" : "#f87171",
            fontWeight: "bold",
          }}
        >
          {value ? "✓" : "✗"}
        </span>

        <span>{label}</span>
      </div>

      <span
        style={{
          color: "#94a3b8",
          fontSize: "14px",
          textAlign: "right",
        }}
      >
        {detail}
      </span>
    </div>
  );
}