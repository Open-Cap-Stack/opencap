import { z } from 'zod';
import { coerceBool } from '../schema.js';
import { type ToolDefinition } from '../types.js';

export const kycTools: ToolDefinition[] = [
  {
    name: 'kyc_status',
    description:
      'Check your own KYC accredited investor verification status. ' +
      'Returns isAccredited, status, expiresAt, and daysUntilExpiry.',
    inputSchema: z.object({}),
    handler: async (_input, client) => {
      const { data } = await client.get('/api/v1/kyc/status');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  },
  {
    name: 'kyc_self_certify',
    description:
      'Submit a self-certification for accredited investor status. ' +
      'The attestationAgreed parameter must be true to proceed.',
    inputSchema: z.object({
      investorType: z
        .enum(['income', 'net_worth', 'professional', 'entity'])
        .describe('Basis for accredited investor qualification'),
      legalName: z.string().describe('Full legal name of the investor'),
      attestationAgreed: coerceBool(
        'Must be true — confirms the investor attests to meeting accreditation criteria'
      ),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/kyc/self-certify', input);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  },
  {
    name: 'kyc_submit_documents',
    description:
      'Submit verification documents for 506(c) accredited investor verification. ' +
      'Requires an offering type and an array of document references.',
    inputSchema: z.object({
      offeringType: z.string().describe('Type of offering (e.g. "506c")'),
      documents: z
        .array(
          z.object({
            type: z.string().describe('Document type (e.g. "tax_return", "bank_statement")'),
            url: z.string().optional().describe('URL or storage path of the document'),
            documentId: z.string().optional().describe('Existing document ID in the system'),
          })
        )
        .describe('Array of documents to submit for verification'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/kyc/documents', input);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  },
  {
    name: 'kyc_pending',
    description:
      'List all pending KYC accredited investor verifications (admin only). ' +
      'Returns an array of pending KYC requests awaiting review.',
    inputSchema: z.object({}),
    handler: async (_input, client) => {
      const { data } = await client.get('/api/v1/kyc/pending');
      const pending = data.pending ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(pending, null, 2) }],
      };
    },
  },
  {
    name: 'kyc_audit_log',
    description:
      'Get the KYC audit trail (admin only). Returns a chronological log of all ' +
      'KYC verification events including submissions, approvals, and rejections.',
    inputSchema: z.object({}),
    handler: async (_input, client) => {
      const { data } = await client.get('/api/v1/kyc/audit-log');
      const entries = data.entries ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }],
      };
    },
  },
];
