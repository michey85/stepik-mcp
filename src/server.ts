import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

 const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});





export default server;
