import { NextResponse } from "next/server";
import { prepareSystem } from "@/lib/core/preparation";

export async function POST() {
  return NextResponse.json(prepareSystem());
}

export async function GET() {
  return NextResponse.json(prepareSystem());
}
