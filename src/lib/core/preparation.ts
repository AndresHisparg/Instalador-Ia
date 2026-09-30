import { NextRequest } from "next/server";
import { POST as prepareEnvironment } from "@/app/api/prepare/route";

export type PreparationResult = {
  success: boolean;
  data: unknown;
};

export async function prepareSystem(
  request: NextRequest,
): Promise<PreparationResult> {
  const response = await prepareEnvironment(request);
  const data = await response.json();

  return {
    success: response.ok,
    data,
  };
}
