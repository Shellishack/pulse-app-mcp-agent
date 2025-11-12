import { Button, Form, Input } from "@heroui/react";
import React, { useState } from "react";
import Icon from "./icon";

export default function AgentChat() {
  const [inputContent, setInputContent] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  async function sendMessage(message: string) {
    setMessages((prev) => [...prev, message]);
  }

  return (
    <div className="w-full h-full bg-content1 grid grid-rows-[1fr_max-content] text-content3-foreground">
      <div className="w-full h-full">
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
              sendMessage(inputContent);
            }}
          >
            <Input
              value={inputContent}
              onValueChange={setInputContent}
              placeholder="Type anything to chat with agent"
              endContent={
                <Button isIconOnly variant="light" type="submit">
                  <div>
                    <Icon name="send" />
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
