import { verifySystem } from "./verification";

export async function getSystemStatus() {
  return await verifySystem();
}
