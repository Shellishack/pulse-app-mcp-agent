import React, { useEffect } from "react";
import "./tailwind.css";
import { useLoading } from "@pulse-editor/react-api";
import HeroProvider from "./components/providers/hero-provider";
import "material-icons/iconfont/material-icons.css";
import AgentChat from "./components/agent-chat";

export default function Main() {
  const { isReady, toggleLoading } = useLoading();

  useEffect(() => {
    if (isReady) {
      toggleLoading(false);
    }
  }, [isReady, toggleLoading]);

  return (
    <HeroProvider>
      <AgentChat />
    </HeroProvider>
  );
}
