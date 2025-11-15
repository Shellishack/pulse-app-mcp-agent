import { Action } from "@pulse-editor/shared-utils";

export const preRegisteredActions: Record<string, Action> = {
  "add-tools": {
    name: "add-tools",
    description: "Assign new tools to the agent.",
    parameters: {
      "mcp-server": {
        type: "object",
        description: "The MCP server(s) available to the agent.",
        optional: true,
      },
      "pulse-app": {
        type: "object",
        description: "The Pulse Apps available to the agent.",
        optional: true,
      },
    },
    // void function with side-effects in UI, 
    // not intended to return anything
    returns: {},
  },
};
