import { NextRequest, NextResponse } from "next/server";

import { getGeminiClient } from "@/lib/gpt/client";
import {
  executeGeminiTool,
  geminiTools,
} from "@/lib/gpt/tools";

const MODEL = process.env.GEMINI_MODEL;

type GptRequest = {
  message?: string;
};

export async function POST(request: NextRequest) {
  let body: GptRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "El cuerpo debe ser JSON.",
      },
      { status: 400 },
    );
  }

  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";

  if (!message) {
    return NextResponse.json(
      {
        success: false,
        error: "Falta el campo message.",
      },
      { status: 400 },
    );
  }

  if (!MODEL) {
    return NextResponse.json(
      {
        success: false,
        error: "Falta la variable de entorno GEMINI_MODEL.",
      },
      { status: 500 },
    );
  }

  try {
    const gemini = getGeminiClient();

    let response = await gemini.interactions.create({
      model: MODEL,
      input: message,
      tools: geminiTools,
    });

    const functionCalls = response.steps.filter(
      (step) => step.type === "function_call",
    );

    if (functionCalls.length > 0) {
      const functionResults = [];

      for (const call of functionCalls) {
        const result = await executeGeminiTool(call.name);

        functionResults.push({
          type: "function_result" as const,
          name: call.name,
          call_id: call.id,
          result: [
            {
              type: "text" as const,
              text: JSON.stringify(result),
            },
          ],
        });
      }

      response = await gemini.interactions.create({
        model: MODEL,
        input: functionResults,
        previous_interaction_id: response.id,
        tools: geminiTools,
      });
    }

    return NextResponse.json({
      success: true,
      responseId: response.id,
      model: MODEL,
      output: response.output_text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error procesando la solicitud Gemini.",
      },
      { status: 500 },
    );
  }
}
