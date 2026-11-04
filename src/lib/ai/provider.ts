/**
 * Provider-agnostic LLM interface.
 * Swap `AI_PROVIDER` env var to switch implementation — no code changes elsewhere.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface LLMChunk {
  type: "text" | "tool_call" | "done";
  text?: string;
  toolCall?: ToolCall;
}

export interface LLMProvider {
  readonly id: string;
  chat(messages: ChatMessage[], tools?: ToolCall[]): AsyncIterable<LLMChunk>;
}

export class MockProvider implements LLMProvider {
  readonly id = "mock";

  async *chat(messages: ChatMessage[]): AsyncIterable<LLMChunk> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const canned = `[Mock AI] Pertanyaan kamu: "${lastUser?.content ?? ""}". ` +
      `Untuk insight keuangan nyata, pilih provider AI di .env (AI_PROVIDER=openai atau deepseek).`;

    for (const word of canned.split(" ")) {
      yield { type: "text", text: word + " " };
      await new Promise((r) => setTimeout(r, 30));
    }
    yield { type: "done" };
  }
}

export function createProvider(): LLMProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";
  switch (provider) {
    case "openai":
    case "deepseek":
      // Real implementation would go here — see roadmap P6
      // Falls back to mock if not yet wired
      return new MockProvider();
    default:
      return new MockProvider();
  }
}
