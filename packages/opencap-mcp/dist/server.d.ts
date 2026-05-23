/**
 * MCP server setup and tool registration.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { type AxiosInstance } from 'axios';
import { type ToolDefinition } from './types.js';
declare const ALL_TOOLS: ToolDefinition[];
export declare function createServer(client: AxiosInstance): Server;
export { ALL_TOOLS };
//# sourceMappingURL=server.d.ts.map