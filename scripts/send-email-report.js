#!/usr/bin/env node

/**
 * Email sender for daily reports
 * Usage: node send-email-report.js <report-file-path> <recipient-email>
 */

const fs = require('fs');
const https = require('https');

const reportPath = process.argv[2];
const recipientEmail = process.argv[3] || 'toby@ainative.studio';
const apiToken = 'kLPiP0bzgKJ0CnNYVt1wq3qxbs2QgDeF2XwyUnxBEOM';

if (!reportPath) {
  console.error('Usage: node send-email-report.js <report-file-path> [recipient-email]');
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  console.error(`Error: Report file not found: ${reportPath}`);
  process.exit(1);
}

// Read the report content
const reportContent = fs.readFileSync(reportPath, 'utf8');

// Create email subject from date
const today = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});
const subject = `Daily Progress Report - ${today} - Urban Tech`;

// Prepare email payload
const payload = JSON.stringify({
  to: recipientEmail,
  subject: subject,
  text: reportContent
});

// API request options
const options = {
  hostname: 'api.ainative.studio',
  port: 443,
  path: '/v1/public/send-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiToken,
    'Content-Length': Buffer.byteLength(payload)
  }
};

// Send request
const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log(`✅ Email sent successfully to ${recipientEmail}`);
      process.exit(0);
    } else {
      console.error(`❌ Failed to send email (HTTP ${res.statusCode})`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending email:', error.message);
  process.exit(1);
});

// Send the request
req.write(payload);
req.end();
