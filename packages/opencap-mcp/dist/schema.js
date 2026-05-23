/**
 * Shared Zod coercion helpers for MCP tool input schemas.
 *
 * MCP clients (including Claude Code) send all arguments as strings. These
 * helpers accept both the native type and a string representation and coerce
 * to the appropriate JavaScript primitive so tools work correctly regardless
 * of how the client serialises values.
 */
import { z } from 'zod';
export const coerceInt = (description) => z
    .union([z.number(), z.string()])
    .transform((v) => parseInt(String(v), 10))
    .describe(description);
export const coerceFloat = (description) => z
    .union([z.number(), z.string()])
    .transform((v) => parseFloat(String(v)))
    .describe(description);
export const coerceBool = (description) => z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === 'true')
    .describe(description);
//# sourceMappingURL=schema.js.map