import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();
/**
 *  An example function to echo the body of a POST request.
 *  This route is accessible at /server-function/echo
 */
export default async function agent(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const {
    userMessage,
    mcpServers,
  }: {
    userMessage: string;
    mcpServers: {
      [key: string]: {
        command: string;
        args: string[];
        type?: "stdio";
      };
    };
  } = await req.json();

  let closed = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function safeClose(error?: any) {
    if (closed) return;
    closed = true;

    // Close response controller
    try {
      // if there was an error, we can optionally send it to the client
      if (error && responseController) {
        responseController.enqueue(
          new TextEncoder().encode(JSON.stringify({ error: error.message }))
        );
      }

      responseController?.close();
      responseController = null;
    } catch {
      // noop
    }

    // Close agent controller
    try {
      agentController?.abort();
      agentController = null;
    } catch {
      // noop
    }

    // Close MCP client
    try {
      await mcpClient?.close();
      mcpClient = null;
    } catch {
      // noop
    }
  }

  let mcpClient: MultiServerMCPClient | null = new MultiServerMCPClient({
    mcpServers,
  });

  const tools = await mcpClient.getTools();

  const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0.95,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const agent = createAgent({ model, tools });

  let agentController: AbortController | null = new AbortController();
  const stream = await agent.stream(
    { messages: [{ role: "user", content: userMessage }] },
    { streamMode: "values", signal: agentController?.signal }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseController: ReadableStreamDefaultController<any> | null = null;
  const resultStream = new ReadableStream({
    async start(streamController) {
      try {
        responseController = streamController;

        for await (const chunk of stream) {
          const latestMessage = chunk.messages.at(-1);
          if (latestMessage?.content) {
            console.log(`Agent: ${latestMessage.content}`);
          } else if (latestMessage?.tool_calls) {
            const toolCallNames = latestMessage.tool_calls.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (tc: any) => tc.name
            );
            console.log(`Calling tools: ${toolCallNames.join(", ")}`);
          }

          responseController.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                content: latestMessage?.content,
                tool_calls: latestMessage?.tool_calls,
                finish_reason: latestMessage?.response_metadata?.finish_reason,
              })
            )
          );
        }
      } catch (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        err: any
      ) {
        console.error("Stream error:", err);
        await safeClose(err);
      } finally {
        console.log("Stream closed.");
        await safeClose();
      }
    },

    async cancel() {
      console.log("ReadableStream.cancel() called");
      await safeClose();
    },
  });

  return new Response(resultStream, {
    headers: { "Content-Type": "application/json" },
  });
}
