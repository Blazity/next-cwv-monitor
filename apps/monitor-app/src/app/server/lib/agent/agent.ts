import { env } from "@/env";
import { stepCountIs, ToolLoopAgent } from "ai";
import { executeClickHouse } from "@/app/server/lib/agent/tools/execute-clickhouse";
import { buildSystemPrompt } from "@/app/server/lib/agent/utils/system-prompt";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

const getModel = () => {
  const provider = env.AI_PROVIDER;
  const apiKey = env.AI_API_KEY;
  const model = env.AI_MODEL;

  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }
    default: {
      throw new Error(`Provider not supported: ${provider}`);
    }
  }
};

export function createAgent(projectId: string) {
  return new ToolLoopAgent({
    model: getModel(),
    instructions: buildSystemPrompt(projectId),
    tools: {
      executeClickHouse,
    },
    stopWhen: [stepCountIs(15)],
  });
}
