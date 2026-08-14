const express = require('express');
const router = express.Router();

const SERVICEOS_BASE_URL = process.env.SERVICEOS_BASE_URL || 'https://helpdesk.ainative.studio';
const SERVICEOS_API_KEY = process.env.SERVICEOS_API_KEY || process.env.AINATIVE_API_TOKEN;
const SERVICEOS_ORG_ID = process.env.SERVICEOS_ORG_ID || 'org_ainative_demo';

router.post('/', async (req, res) => {
  const { email, message, name } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  if (!SERVICEOS_API_KEY) {
    console.error('SERVICEOS_API_KEY / AINATIVE_API_TOKEN not configured');
    return res.status(503).json({ error: 'Support service unavailable' });
  }

  try {
    const response = await fetch(`${SERVICEOS_BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERVICEOS_API_KEY,
        'x-org-id': SERVICEOS_ORG_ID,
      },
      body: JSON.stringify({
        title: `[Widget] ${message.slice(0, 80)}`,
        description: `${message}\n\n---\nFrom: ${name || email}\nEmail: ${email}\nSource: opencapstack.com support widget`,
        priority: 'normal',
        tags: ['opencapstack', 'support-widget'],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`ServiceOS ticket creation failed (${response.status}):`, text);
      return res.status(502).json({ error: 'Failed to submit support request' });
    }

    const data = await response.json();
    const ticketId = data.data?.row_id || data.data?.row_data?.id;
    return res.status(201).json({ success: true, ticketId });
  } catch (err) {
    console.error('ServiceOS request failed:', err.message);
    return res.status(502).json({ error: 'Support service unreachable' });
  }
});

module.exports = router;
