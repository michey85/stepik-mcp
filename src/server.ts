import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convertToMessage, getCourseBenefits } from "./services/money.js";

 const server = new McpServer({
  name: "stepik-mcp",
  version: "1.0.0",
});

server.registerTool(
  "getCourseBenefits",
  {
    description: "Get course benefits for the last 24 hours",
    outputSchema: z.array(z.object({ text: z.string() })),
  },
  async () => {
      const benefits = await getCourseBenefits();
      const message = convertToMessage(benefits);

      return {
        content: [
          { text: message, type: "text" },
        ]
      }
  }
);



export default server;
