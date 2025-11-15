import { Button, Form, Input } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import Icon from "./icon";

export default function AgentChat() {
  const [inputContent, setInputContent] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const messageDivRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messageDivRef.current?.scrollTo({
      top: messageDivRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

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

    setMessages((prev) => [...prev, message]);

    setIsRunning(true);

    controllerRef.current = new AbortController();
    const response = await fetch("/server-function/agent", {
      method: "POST",
      body: JSON.stringify({ userMessage: message }),
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
        console.log(`Agent: ${chunk.content}`);
        setMessages((prev) => [...prev, chunk.content]);
      } else if (chunk?.tool_calls) {
        const toolCallNames = chunk.tool_calls.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (tc: any) => tc.name
        );
        console.log(`Calling tools: ${toolCallNames.join(", ")}`);
        setMessages((prev) => {
          const toolMessage = `Calling tools: ${toolCallNames.join(", ")}`;
          return [...prev, toolMessage];
        });
      } else if (chunk?.finish_reason) {
        console.log(`Finished with reason: ${chunk.finish_reason}`);
        setMessages((prev) => [
          ...prev,
          `Finished with reason: ${chunk.finish_reason}`,
        ]);
      }
    }
  }

  return (
    <div className="w-full h-full bg-content1 grid grid-rows-[1fr_max-content] text-content3-foreground">
      <div
        ref={messageDivRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden"
      >
        {messages.map((msg, index) => (
          <div key={index} className="p-4 border-b border-border2">
            {msg}
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
