/**
 * Shared Zod coercion helpers for MCP tool input schemas.
 *
 * MCP clients (including Claude Code) send all arguments as strings. These
 * helpers accept both the native type and a string representation and coerce
 * to the appropriate JavaScript primitive so tools work correctly regardless
 * of how the client serialises values.
 */
import { z } from 'zod';
export declare const coerceInt: (description: string) => z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
export declare const coerceFloat: (description: string) => z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
export declare const coerceBool: (description: string) => z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>;
//# sourceMappingURL=schema.d.ts.map