import { GET as verifyEnvironment } from "@/app/api/verify/route";

export type SystemStatus = {
  success: boolean;
  data: unknown;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const response = await verifyEnvironment();
  const data = await response.json();

  return {
    success: response.ok,
    data,
  };
}
