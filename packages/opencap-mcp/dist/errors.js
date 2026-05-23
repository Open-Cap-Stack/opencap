/**
 * Actionable error formatting for MCP tool responses.
 *
 * Translates raw HTTP and validation errors into messages that tell the
 * user exactly what went wrong and what to do next.
 */
import { ZodError } from 'zod';
export function formatMcpError(err) {
    // Handle Zod validation errors first
    if (err instanceof ZodError) {
        const details = err.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ');
        return `Invalid input: ${details}`;
    }
    const axiosErr = err;
    const status = axiosErr?.response?.status;
    const serverMsg = axiosErr?.response?.data?.error ??
        axiosErr?.response?.data?.message ??
        axiosErr?.message;
    if (status === 401 || status === 403) {
        return ('Access denied. Check your API key and ensure companyId in the request matches your account. ' +
            `Run \`whoami\` to verify your current token. (${serverMsg})`);
    }
    if (status === 404) {
        return ('Record not found. Make sure you are using the domain ID (e.g. `safeId`, `row_id`), ' +
            `not the MongoDB \`_id\` field. Use list_* tools to find the correct ID. (${serverMsg})`);
    }
    if (status === 400) {
        return `Invalid request: ${serverMsg}. Check that all required fields are provided and values are the correct type.`;
    }
    if (status === 500) {
        return ('The server could not save the record. This may be a temporary issue, or a referenced ID ' +
            `(equityPlanId, employeeId, etc.) may not exist. Try again or verify referenced IDs. (${serverMsg})`);
    }
    return `OpenCap API error (${status ?? 'unknown'}): ${serverMsg ?? String(err)}`;
}
//# sourceMappingURL=errors.js.map