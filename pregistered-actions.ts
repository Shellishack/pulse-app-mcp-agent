import { Action } from "@pulse-editor/shared-utils";

export const preRegisteredActions: Record<string, Action> = {
  "add-tools": {
    name: "add-tools",
    description: "Assign new tools to the agent.",
    parameters: {
      "mcp-server": {
        type: {
          server: {
            type: {
              command: {
                type: "string",
                description: "The command to start the MCP server.",
              },
              args: {
                type: ["string"],
                description: "The arguments for the MCP server command.",
              },
            },
            description: "The MCP server.",
          },
        },
        description: "The MCP tools available to the agent.",
        optional: true,
      },
      "pulse-app": {
        type: [
          {
            name: {
              type: "string",
              description: "The name of the Pulse App.",
            },
            instanceId: {
              type: "string",
              description: "The unique instance ID of the Pulse App.",
            },
            description: {
              type: "string",
              description: "A brief description of the Pulse App.",
            },
            actions: {
              type: "any",
              description: "The actions supported by the Pulse App.",
            },
          },
        ],
        description: "The Pulse Apps available to the agent.",
        optional: true,
      },
    },
    returns: {},
  },
};
