/**
 * MCP server setup and tool registration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { type AxiosInstance } from 'axios';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { stakeholderTools } from './tools/stakeholders.js';
import { shareClassTools } from './tools/shareClasses.js';
import { equityPlanTools } from './tools/equityPlans.js';
import { safeTools } from './tools/safes.js';
import { documentTools } from './tools/documents.js';
import { valuationTools } from './tools/valuations.js';
import { dilutionTools } from './tools/dilution.js';
import { waterfallTools } from './tools/waterfall.js';
import { financialReportTools } from './tools/financialReports.js';
import { equityGrantTools } from './tools/equityGrants.js';
import { metaTools } from './tools/meta.js';
import { portfolioTools } from './tools/portfolio.js';
import { complianceTools } from './tools/compliance.js';
import { exportTools } from './tools/export.js';
import { kycTools } from './tools/kyc.js';
import { mercuryTools } from './tools/mercury.js';
import { boardTools } from './tools/board.js';
import { type ToolDefinition } from './types.js';
import { formatMcpError } from './errors.js';

const ALL_TOOLS: ToolDefinition[] = [
  ...metaTools,
  ...stakeholderTools,
  ...shareClassTools,
  ...equityPlanTools,
  ...equityGrantTools,
  ...safeTools,
  ...documentTools,
  ...valuationTools,
  ...dilutionTools,
  ...waterfallTools,
  ...financialReportTools,
  ...portfolioTools,
  ...complianceTools,
  ...exportTools,
  ...kycTools,
  ...mercuryTools,
  ...boardTools,
];

export function createServer(client: AxiosInstance): Server {
  const server = new Server(
    {
      name: 'opencap-mcp',
      version: '1.10.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = ALL_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema) as Tool['inputSchema'],
    }));
    return { tools };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    const tool = ALL_TOOLS.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const parsed = tool.inputSchema.parse(args ?? {});
      const result = await tool.handler(parsed, client);
      return result;
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool error: ${formatMcpError(error)}` }],
        isError: true,
      };
    }
  });

  return server;
}

// Keep the schema reference to avoid unused-import warnings
void CallToolResultSchema;

export { ALL_TOOLS };
