/**
 * Document Generator Service
 *
 * Generates legal document PDFs for equity transactions:
 * - Restricted Stock Purchase Agreements (RSPA)
 * - Stock Certificates
 * - Section 83(b) Elections
 *
 * Issue #666
 */

'use strict';

const PDFDocument = require('pdfkit');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all chunks written to a PDFDocument stream into a single Buffer.
 * @param {PDFDocument} doc - a PDFKit document instance (do NOT call .end() before passing)
 * @returns {Promise<Buffer>}
 */
function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

/**
 * Format a number with commas (e.g. 1000000 -> "1,000,000").
 */
function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

/**
 * Format a dollar amount (e.g. 1500.5 -> "$1,500.50").
 */
function formatCurrency(n) {
  if (n == null) return '$0.00';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// RSPA Generator
// ---------------------------------------------------------------------------

/**
 * Generate a Restricted Stock Purchase Agreement PDF.
 *
 * @param {Object} params
 * @param {string} params.companyName
 * @param {string} params.companyState
 * @param {string} params.purchaserName
 * @param {string} params.purchaserAddress
 * @param {number} params.shares
 * @param {number} params.pricePerShare
 * @param {number} params.totalPrice
 * @param {string} params.paymentForm
 * @param {string} [params.vestingSchedule]
 * @param {number} [params.vestingMonths]
 * @param {number} [params.cliffMonths]
 * @param {string} params.effectiveDate
 * @param {string} [params.accelerationProvisions]
 * @returns {Promise<Buffer>} PDF content
 */
async function generateRSPA(params) {
  const {
    companyName,
    companyState,
    purchaserName,
    purchaserAddress,
    shares,
    pricePerShare,
    totalPrice,
    paymentForm,
    vestingSchedule,
    vestingMonths,
    cliffMonths,
    effectiveDate,
    accelerationProvisions,
  } = params;

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 72, right: 72 } });

  // ---- Title Page ----
  doc.fontSize(18).font('Helvetica-Bold').text('RESTRICTED STOCK PURCHASE AGREEMENT', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(11).font('Helvetica').text(
    `This Restricted Stock Purchase Agreement (this "Agreement") is made as of ${effectiveDate} ` +
    `by and between ${companyName}, a ${companyState} corporation (the "Company"), and ` +
    `${purchaserName} (the "Purchaser"), residing at ${purchaserAddress}.`,
    { align: 'left', lineGap: 4 }
  );
  doc.moveDown(1.5);

  // ---- Key Terms ----
  doc.fontSize(13).font('Helvetica-Bold').text('1. KEY TERMS');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Number of Shares: ${formatNumber(shares)} shares of Common Stock`);
  doc.text(`Price Per Share: ${formatCurrency(pricePerShare)}`);
  doc.text(`Total Purchase Price: ${formatCurrency(totalPrice)}`);
  doc.text(`Form of Payment: ${paymentForm || 'Cash'}`);
  doc.moveDown(1.5);

  // ---- Vesting Schedule ----
  if (vestingSchedule || vestingMonths) {
    doc.fontSize(13).font('Helvetica-Bold').text('2. VESTING SCHEDULE');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    if (vestingSchedule) {
      doc.text(vestingSchedule, { lineGap: 4 });
    }
    if (vestingMonths) {
      doc.text(`Total Vesting Period: ${vestingMonths} months`);
    }
    if (cliffMonths) {
      doc.text(`Cliff Period: ${cliffMonths} months`);
    }
    doc.moveDown(1.5);
  }

  // ---- Acceleration Provisions ----
  if (accelerationProvisions) {
    doc.fontSize(13).font('Helvetica-Bold').text('3. ACCELERATION PROVISIONS');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(accelerationProvisions, { lineGap: 4 });
    doc.moveDown(1.5);
  }

  // ---- Investment Representations ----
  const repSection = accelerationProvisions ? '4' : (vestingSchedule || vestingMonths ? '3' : '2');
  doc.fontSize(13).font('Helvetica-Bold').text(`${repSection}. INVESTMENT REPRESENTATIONS`);
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica').text(
    'The Purchaser represents and warrants to the Company that:\n\n' +
    '(a) The Purchaser is acquiring the Shares for investment for the Purchaser\'s own account, ' +
    'not as a nominee or agent, and not with a view to, or for resale in connection with, ' +
    'any distribution thereof.\n\n' +
    '(b) The Purchaser has had an opportunity to ask questions and receive answers from the Company ' +
    'regarding the terms and conditions of this investment and has received all information ' +
    'the Purchaser considers necessary or appropriate for deciding whether to purchase the Shares.\n\n' +
    '(c) The Purchaser is an accredited investor as defined in Rule 501 of Regulation D ' +
    'promulgated under the Securities Act of 1933, as amended.',
    { lineGap: 4 }
  );
  doc.moveDown(1.5);

  // ---- Restrictive Legends ----
  const legendSection = String(Number(repSection) + 1);
  doc.fontSize(13).font('Helvetica-Bold').text(`${legendSection}. RESTRICTIVE LEGENDS`);
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica').text(
    'All certificates representing the Shares shall bear the following legend:\n\n' +
    '"THE SHARES REPRESENTED BY THIS CERTIFICATE HAVE NOT BEEN REGISTERED UNDER ' +
    'THE SECURITIES ACT OF 1933, AS AMENDED, OR UNDER ANY STATE SECURITIES LAWS. ' +
    'THESE SHARES MAY NOT BE SOLD, OFFERED FOR SALE, PLEDGED, OR HYPOTHECATED IN ' +
    'THE ABSENCE OF AN EFFECTIVE REGISTRATION STATEMENT UNDER SUCH ACT AND APPLICABLE ' +
    'STATE SECURITIES LAWS OR AN OPINION OF COUNSEL SATISFACTORY TO THE COMPANY THAT ' +
    'SUCH REGISTRATION IS NOT REQUIRED."',
    { lineGap: 4 }
  );
  doc.moveDown(1.5);

  // ---- Section 83(b) Notice ----
  const electionSection = String(Number(legendSection) + 1);
  doc.fontSize(13).font('Helvetica-Bold').text(`${electionSection}. SECTION 83(b) ELECTION`);
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica').text(
    'The Purchaser understands that Section 83(a) of the Internal Revenue Code of 1986, as amended ' +
    '(the "Code"), taxes as ordinary income the difference between the amount paid for the Shares and ' +
    'the fair market value of the Shares as of the date any restrictions on the Shares lapse. ' +
    'The Purchaser understands that the Purchaser may elect to be taxed at the time the Shares are ' +
    'purchased, rather than when and as the restrictions on the Shares lapse, by filing an election ' +
    'under Section 83(b) of the Code with the Internal Revenue Service within thirty (30) days from ' +
    'the date of purchase.',
    { lineGap: 4 }
  );
  doc.moveDown(2);

  // ---- Signature Blocks ----
  doc.addPage();
  doc.fontSize(13).font('Helvetica-Bold').text('SIGNATURE PAGE');
  doc.moveDown(2);

  doc.fontSize(11).font('Helvetica-Bold').text('COMPANY:');
  doc.moveDown(1);
  doc.font('Helvetica').text(companyName);
  doc.moveDown(1.5);
  doc.text('By: ___________________________________');
  doc.text('Name:');
  doc.text('Title: Authorized Officer');
  doc.text(`Date: ${effectiveDate}`);
  doc.moveDown(2);

  doc.font('Helvetica-Bold').text('PURCHASER:');
  doc.moveDown(1);
  doc.font('Helvetica').text(purchaserName);
  doc.moveDown(1.5);
  doc.text('Signature: ___________________________________');
  doc.text(`Address: ${purchaserAddress}`);
  doc.text(`Date: ${effectiveDate}`);

  return pdfToBuffer(doc);
}

// ---------------------------------------------------------------------------
// Stock Certificate Generator
// ---------------------------------------------------------------------------

/**
 * Generate a Stock Certificate PDF.
 *
 * @param {Object} params
 * @param {string} params.companyName
 * @param {string} params.companyState
 * @param {string} params.holderName
 * @param {number} params.shares
 * @param {string|number} params.certificateNumber
 * @param {string} params.date
 * @param {string} params.officerName
 * @param {string} params.officerTitle
 * @returns {Promise<Buffer>} PDF content
 */
async function generateStockCertificate(params) {
  const {
    companyName,
    companyState,
    holderName,
    shares,
    certificateNumber,
    date,
    officerName,
    officerTitle,
  } = params;

  const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 50, bottom: 50, left: 60, right: 60 } });

  // ---- Header ----
  doc.fontSize(10).font('Helvetica').text(
    `Incorporated Under the Laws of the State of ${companyState}`,
    { align: 'center' }
  );
  doc.moveDown(0.5);

  doc.fontSize(9).text(`Certificate Number: C-${certificateNumber}`, { align: 'left' });
  doc.moveDown(1);

  // ---- Share Count ----
  doc.fontSize(28).font('Helvetica-Bold').text(`** ${formatNumber(shares)} **`, { align: 'center' });
  doc.moveDown(0.5);

  // ---- Company Name ----
  doc.fontSize(22).font('Helvetica-Bold').text(companyName, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica').text('Common Stock', { align: 'center' });
  doc.moveDown(1.5);

  // ---- Body ----
  doc.fontSize(11).font('Helvetica').text(
    `THIS CERTIFIES THAT ${holderName} is the record holder of ${formatNumber(shares)} Shares ` +
    `of the Common Stock of ${companyName}, transferable only on the books of the Corporation ` +
    `by the holder hereof in person or by duly authorized attorney upon surrender of this ` +
    `Certificate properly endorsed.`,
    { align: 'center', lineGap: 4 }
  );
  doc.moveDown(1);

  // ---- Transfer Language ----
  doc.fontSize(10).font('Helvetica').text(
    'This Certificate is not valid unless countersigned and registered by the Transfer Agent ' +
    'and Registrar. The shares represented by this Certificate are subject to the restrictions ' +
    'on transfer set forth in the Company\'s Bylaws and any applicable stockholders\' agreement.',
    { align: 'center', lineGap: 3 }
  );
  doc.moveDown(2);

  // ---- Date and Signatures ----
  doc.fontSize(11).font('Helvetica').text(`Dated: ${date}`, { align: 'center' });
  doc.moveDown(2);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / 2;

  const sigY = doc.y;
  doc.text('___________________________________', doc.page.margins.left, sigY, { width: colWidth, align: 'center' });
  doc.text('Secretary', doc.page.margins.left, doc.y, { width: colWidth, align: 'center' });

  doc.text('___________________________________', doc.page.margins.left + colWidth, sigY, { width: colWidth, align: 'center' });
  doc.text(`${officerName}, ${officerTitle}`, doc.page.margins.left + colWidth, doc.y - 14, { width: colWidth, align: 'center' });

  doc.moveDown(3);

  // ---- Restrictive Legends (reverse side note) ----
  doc.fontSize(9).font('Helvetica-Bold').text('RESTRICTIVE LEGENDS (See Reverse Side)', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').text(
    'THE SHARES REPRESENTED BY THIS CERTIFICATE HAVE NOT BEEN REGISTERED UNDER THE SECURITIES ACT OF 1933, ' +
    'AS AMENDED, OR UNDER ANY STATE SECURITIES LAWS. THESE SHARES MAY NOT BE SOLD, OFFERED FOR SALE, ' +
    'PLEDGED, OR HYPOTHECATED IN THE ABSENCE OF AN EFFECTIVE REGISTRATION STATEMENT UNDER SUCH ACT AND ' +
    'APPLICABLE STATE SECURITIES LAWS OR AN OPINION OF COUNSEL SATISFACTORY TO THE COMPANY THAT SUCH ' +
    'REGISTRATION IS NOT REQUIRED.',
    { align: 'center', lineGap: 2 }
  );

  return pdfToBuffer(doc);
}

// ---------------------------------------------------------------------------
// Section 83(b) Election Generator
// ---------------------------------------------------------------------------

/**
 * Generate a Section 83(b) Election PDF.
 *
 * @param {Object} params
 * @param {string} params.taxpayerName
 * @param {string} params.companyName
 * @param {number} params.shares
 * @param {string} params.transferDate
 * @param {string|number} params.taxYear
 * @param {number} params.fairMarketValue
 * @param {number} params.amountPaid
 * @param {string} params.restrictions
 * @returns {Promise<Buffer>} PDF content
 */
async function generate83bElection(params) {
  const {
    taxpayerName,
    companyName,
    shares,
    transferDate,
    taxYear,
    fairMarketValue,
    amountPaid,
    restrictions,
  } = params;

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 72, right: 72 } });

  // ---- Title ----
  doc.fontSize(14).font('Helvetica-Bold').text(
    'ELECTION UNDER SECTION 83(B) OF THE INTERNAL REVENUE CODE OF 1986',
    { align: 'center' }
  );
  doc.moveDown(1.5);

  // ---- Addressee ----
  doc.fontSize(11).font('Helvetica').text('Department of the Treasury');
  doc.text('Internal Revenue Service Center');
  doc.moveDown(1);

  doc.text(
    'The undersigned taxpayer hereby elects, pursuant to Section 83(b) of the Internal Revenue ' +
    'Code of 1986, as amended, to include in gross income as compensation for services the ' +
    'excess (if any) of the fair market value of the property described below over the amount ' +
    'paid for such property.',
    { lineGap: 4 }
  );
  doc.moveDown(1.5);

  // ---- Numbered Items ----
  doc.fontSize(11).font('Helvetica-Bold').text('1. Taxpayer Information');
  doc.font('Helvetica').text(`Name: ${taxpayerName}`);
  doc.text('Social Security Number: ___-__-____');
  doc.text(`Tax Year: ${taxYear}`);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('2. Description of Property');
  doc.font('Helvetica').text(
    `${formatNumber(shares)} shares of Common Stock of ${companyName}.`
  );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('3. Date of Transfer');
  doc.font('Helvetica').text(
    `The property was transferred on ${transferDate}.`
  );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('4. Taxable Year');
  doc.font('Helvetica').text(
    `This election is made for the taxable year ending December 31, ${taxYear}.`
  );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('5. Fair Market Value');
  doc.font('Helvetica').text(
    `The fair market value of the property at the time of transfer is ${formatCurrency(fairMarketValue)}.`
  );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('6. Amount Paid for Property');
  doc.font('Helvetica').text(
    `The amount paid for the property is ${formatCurrency(amountPaid)}.`
  );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('7. Nature of Restrictions');
  doc.font('Helvetica').text(
    restrictions || 'The property is subject to a vesting schedule. Unvested shares are subject to repurchase by the Company at the original purchase price upon termination of service.',
    { lineGap: 4 }
  );
  doc.moveDown(2);

  // ---- Signature Block ----
  doc.fontSize(11).font('Helvetica').text('Dated: ___________________');
  doc.moveDown(1.5);
  doc.text('Signature: ___________________________________');
  doc.moveDown(0.5);
  doc.text(`Name: ${taxpayerName}`);
  doc.moveDown(2);

  // ---- Filing Instructions Box ----
  doc.rect(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 120)
    .stroke();

  const boxX = doc.x + 10;
  const boxY = doc.y + 10;

  doc.fontSize(10).font('Helvetica-Bold').text('FILING INSTRUCTIONS', boxX, boxY, { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').text(
    '1. This election must be filed with the IRS within 30 days after the date of transfer.\n' +
    '2. Send the original to the IRS Service Center where you file your tax return.\n' +
    '3. Attach a copy to your federal income tax return for the year of transfer.\n' +
    '4. Provide a copy to the Company (transferor of the property).\n' +
    '5. Keep a copy for your records.',
    boxX, doc.y,
    { lineGap: 3, width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 20 }
  );

  return pdfToBuffer(doc);
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

const REQUIRED_RSPA_FIELDS = [
  'companyName', 'companyState', 'purchaserName', 'purchaserAddress',
  'shares', 'pricePerShare', 'totalPrice', 'effectiveDate',
];

const REQUIRED_CERT_FIELDS = [
  'companyName', 'companyState', 'holderName', 'shares',
  'certificateNumber', 'date', 'officerName', 'officerTitle',
];

const REQUIRED_83B_FIELDS = [
  'taxpayerName', 'companyName', 'shares', 'transferDate',
  'taxYear', 'fairMarketValue', 'amountPaid',
];

/**
 * Validate that all required fields are present in params.
 * @param {string[]} requiredFields
 * @param {Object} params
 * @returns {string[]} list of missing field names (empty if valid)
 */
function validateRequired(requiredFields, params) {
  return requiredFields.filter((f) => params[f] == null || params[f] === '');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  generateRSPA,
  generateStockCertificate,
  generate83bElection,
  validateRequired,
  REQUIRED_RSPA_FIELDS,
  REQUIRED_CERT_FIELDS,
  REQUIRED_83B_FIELDS,
};
