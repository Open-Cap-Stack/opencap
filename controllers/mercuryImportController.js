'use strict';

/**
 * Mercury Statement Import Controller
 * Issue #675: Bank statement import endpoint
 *
 * POST /api/v1/integrations/mercury/import-statements
 * Downloads Mercury bank statements as PDFs and stores them
 * as document records in ZeroDB for data room access.
 */

const mercuryService = require('../services/mercuryService');
const zerodbService = require('../services/zerodbService');

/**
 * Import Mercury bank statements for a given account and date range.
 *
 * Request body:
 *   { accountId: string, startDate: string, endDate: string }
 *
 * Response:
 *   { imported: [{ documentId, month }], errors: [{ month, error }] }
 */
async function importStatements(req, res) {
    try {
        const { accountId, startDate, endDate } = req.body;

        // Input validation
        if (!accountId) {
            return res.status(400).json({
                error: 'accountId is required',
            });
        }
        if (!startDate) {
            return res.status(400).json({
                error: 'startDate is required',
            });
        }
        if (!endDate) {
            return res.status(400).json({
                error: 'endDate is required',
            });
        }

        const userId = req.user.userId;
        const companyId = req.user.companyId;

        // Fetch statements from Mercury API
        let statementsData;
        try {
            statementsData = await mercuryService.getStatements(
                userId,
                accountId,
                startDate,
                endDate
            );
        } catch (err) {
            console.error(
                '[mercury-import] Failed to fetch statements:',
                err.message
            );
            return res.status(502).json({
                error: `Mercury API error: ${err.message}`,
            });
        }

        const statements = statementsData?.statements || [];

        if (statements.length === 0) {
            return res.status(200).json({ imported: [], errors: [] });
        }

        // Look up company name for document naming
        let companyName = 'Company';
        try {
            const companyResult = await zerodbService.queryRows(
                'companies',
                { _id: companyId },
                { limit: 1 }
            );
            const companyRows = companyResult?.data || [];
            if (companyRows.length > 0 && companyRows[0].row_data?.name) {
                companyName = companyRows[0].row_data.name;
            }
        } catch (err) {
            // Non-fatal — use fallback company name
            console.warn(
                '[mercury-import] Company lookup failed, using fallback:',
                err.message
            );
        }

        const imported = [];
        const errors = [];

        for (const statement of statements) {
            try {
                // Download the PDF
                const pdfBuffer = await mercuryService.downloadStatementPdf(
                    userId,
                    statement.url
                );

                // Create document record in ZeroDB
                const docName = `Mercury_Statement_${statement.month}_${companyName}.pdf`;
                const docResult = await zerodbService.insertRow('documents', {
                    category: 'financial',
                    type: 'bank_statement',
                    documentType: 'bank_statement',
                    source: 'mercury',
                    name: docName,
                    fileContentBase64: pdfBuffer.toString('base64'),
                    companyId,
                    mercuryStatementId: statement.id,
                    statementMonth: statement.month,
                    createdAt: new Date().toISOString(),
                });

                const docId =
                    docResult?.data?.[0]?.row_id ||
                    docResult?.data?.[0]?._id ||
                    null;

                imported.push({
                    documentId: docId,
                    month: statement.month,
                    name: docName,
                });
            } catch (err) {
                console.error(
                    `[mercury-import] Failed to import statement ${statement.month}:`,
                    err.message
                );
                errors.push({
                    month: statement.month,
                    error: err.message,
                });
            }
        }

        return res.status(200).json({ imported, errors });
    } catch (err) {
        console.error('[mercury-import] Unexpected error:', err.message);
        return res.status(500).json({
            error: 'Internal server error during statement import',
        });
    }
}

module.exports = { importStatements };
