import { NextResponse } from "next/server";
import { verifySystem } from "@/lib/core/verification";

export async function GET() {
  return NextResponse.json(verifySystem());
}
