import { Button, Form, Input } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import Icon from "./icon";
import { useRegisterAction } from "@pulse-editor/react-api";
import { preRegisteredActions } from "../../pregistered-actions";

export default function AgentChat() {
  const [inputContent, setInputContent] = useState("");
  const [messages, setMessages] = useState<
    {
      from: string;
      content: string;
    }[]
  >([]);
  const [isRunning, setIsRunning] = useState(false);
  const [mcpServers, setMcpServers] = useState<{
    server: {
      [key: string]: {
        command: string;
        args: string[];
        type: "stdio" | "sse";
      };
    };
  }>({
    server: {},
  });
  const [pulseApps, setPulseApps] = useState<
    {
      name: string;
      description: string;
      version: string;
    }[]
  >([]);

  const controllerRef = useRef<AbortController | null>(null);
  const messageDivRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messageDivRef.current?.scrollTo({
      top: messageDivRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useRegisterAction(
    preRegisteredActions["add-tools"],
    async (params) => {
      const {
        "mcp-server": newMcpServers,
        "pulse-app": newPulseApps,
      }: {
        "mcp-server"?: {
          [key: string]: {
            command: string;
            args: string[];
            type: "stdio" | "sse";
          };
        };
        "pulse-app"?: {
          name: string;
          description: string;
          version: string;
        }[];
      } = params;

      if (newMcpServers) {
        setMcpServers((prev) => ({
          server: {
            ...prev.server,
            ...newMcpServers,
          },
        }));
      }
      if (newPulseApps) {
        setPulseApps((prev) => [...prev, ...newPulseApps]);
      }
    },
    []
  );

  // Scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSubmit(message: string) {
    if (isRunning) {
      if (!controllerRef.current) {
        console.warn("No controller to abort");
        return;
      }
      controllerRef.current?.abort();
      controllerRef.current = null;
      setIsRunning(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        from: "User",
        content: message,
      },
    ]);

    setIsRunning(true);

    controllerRef.current = new AbortController();
    const response = await fetch("/server-function/agent", {
      method: "POST",
      body: JSON.stringify({
        userMessage: message,
        mcpServers: mcpServers.server,
      }),
      headers: { "Content-Type": "application/json" },
      signal: controllerRef.current.signal,
    });
    if (!response.ok) {
      console.error("Error from server:", response.statusText);
      setIsRunning(false);
      controllerRef.current = null;
      return;
    } else if (!response.body) {
      setIsRunning(false);
      controllerRef.current = null;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        setIsRunning(false);
        controllerRef.current = null;
        break;
      }
      const chunk = JSON.parse(decoder.decode(value));

      console.log("Received chunk:", JSON.stringify(chunk, null, 2));

      if (chunk?.content) {
        setMessages((prev) => [
          ...prev,
          {
            from: "Agent",
            content: chunk.content,
          },
        ]);
      } else if (chunk?.tool_calls) {
        const toolCallNames = chunk.tool_calls.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (tc: any) => tc.name
        );
        setMessages((prev) => {
          const toolMessage = `Calling tools: ${toolCallNames.join(", ")}`;
          return [...prev, { from: "Agent", content: toolMessage }];
        });
      } else if (chunk?.finish_reason) {
        setMessages((prev) => [
          ...prev,
          {
            from: "Agent",
            content: `Finished with reason: ${chunk.finish_reason}`,
          },
        ]);
      }
    }
  }

  return (
    <div className="w-full h-full bg-content1 grid grid-rows-[max-content_1fr_max-content] text-content3-foreground">
      <div>
        <div className="p-4 font-bold text-center">Agent Chat</div>
        {/* Display available tools */}
        <div className="p-4">
          <div className="bg-content2 text-content2-foreground rounded-2xl p-4">
            <strong>Registered MCP Servers:</strong>
            <p>[{Object.keys(mcpServers.server).join(", ")}]</p>
          </div>
        </div>
      </div>
      <div
        ref={messageDivRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden"
      >
        {messages.map((msg, index) => (
          <div key={index} className="p-4 border-b border-border2">
            <p>
              <strong>{msg.from}:</strong>
            </p>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center pb-1">
        <div className="px-8 w-full">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(inputContent);
              setInputContent("");
            }}
          >
            <Input
              value={inputContent}
              onValueChange={setInputContent}
              placeholder="Type anything to chat with agent"
              endContent={
                <Button isIconOnly variant="light" type="submit">
                  <div>
                    {isRunning ? <Icon name="stop" /> : <Icon name="send" />}
                  </div>
                </Button>
              }
            />
          </Form>
        </div>
        <p>Your chat app is also available at (WIP)</p>
      </div>
    </div>
  );
}
