import * as React from "react";

// 1. import `HeroUIProvider` component
import { HeroUIProvider, ToastProvider } from "@heroui/react";

export default function HeroProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 2. Wrap HeroUIProvider at the root of your app
  return (
    <HeroUIProvider className="w-full h-full">
      <ToastProvider />
      {children}
    </HeroUIProvider>
  );
}
