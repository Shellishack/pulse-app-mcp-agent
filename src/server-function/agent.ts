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
  }: {
    userMessage: string;
  } = await req.json();

  const mcpClient = new MultiServerMCPClient({
    "chrome-devtools": {
      transport: "stdio", // Local subprocess communication
      command: "npx",
      args: ["chrome-devtools-mcp@latest"],
    },
  });

  const tools = await mcpClient.getTools();

  const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0.95,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const agent = createAgent({
    model,
    tools,
  });

  const stream = await agent.stream(
    {
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    },
    { streamMode: "values" }
  );

  for await (const chunk of stream) {
    // Each chunk contains the full state at that point
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

    if (latestMessage.response_metadata) {
      if (latestMessage.response_metadata.finish_reason === "stop") {
        console.log("Agent finished its task.");
        mcpClient.close();
        break;
      }
    }
  }

  // Process the data and return a response
  return new Response(JSON.stringify(stream), { status: 200 });
}
