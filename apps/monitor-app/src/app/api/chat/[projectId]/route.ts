import { createAgent } from "@/app/server/lib/agent/agent";
import { createAgentUIStreamResponse, UIMessage } from "ai";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const { messages }: { messages: UIMessage[] } = await req.json();

    const agent = createAgent(projectId);

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { ok: false, error: errorMessage },
      {
        status: 500,
      },
    );
  }
}
