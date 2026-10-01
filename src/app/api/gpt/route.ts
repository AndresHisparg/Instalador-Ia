import { NextRequest, NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/gpt/client";
import {
  executeGptTool,
  gptTools,
} from "@/lib/gpt/tools";

const MODEL = process.env.OPENAI_MODEL;

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
        error: "Falta la variable de entorno OPENAI_MODEL.",
      },
      { status: 500 },
    );
  }

  try {
    const openai = getOpenAIClient();

    let response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "user",
          content: message,
        },
      ],
      tools: gptTools,
    });

    const toolOutputs = [];

    for (const item of response.output) {
      if (item.type !== "function_call") {
        continue;
      }

      const result = await executeGptTool(item.name);

      toolOutputs.push({
        type: "function_call_output" as const,
        call_id: item.call_id,
        output: JSON.stringify(result),
      });
    }

    if (toolOutputs.length > 0) {
      response = await openai.responses.create({
        model: MODEL,
        input: toolOutputs,
        previous_response_id: response.id,
        tools: gptTools,
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
            : "Error procesando la solicitud GPT.",
      },
      { status: 500 },
    );
  }
}
