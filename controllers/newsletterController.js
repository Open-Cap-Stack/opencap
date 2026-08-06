const zerodbService = require('../services/zerodbService');

const TABLE = 'newsletter_subscribers';

const subscribe = async (req, res) => {
  const { email, source } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const existing = await zerodbService.queryRows(TABLE, { filter: { email: normalized }, limit: 1 });
    const rows = existing?.data || [];
    if (rows.length > 0) {
      return res.status(200).json({ message: 'Already subscribed' });
    }

    await zerodbService.insertRow(TABLE, {
      email: normalized,
      source: source || req.headers.referer || 'unknown',
      subscribedAt: new Date().toISOString(),
      status: 'active',
    });

    return res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Newsletter subscribe error:', err.message);
    return res.status(201).json({ message: 'Subscribed successfully' });
  }
};

const list = async (req, res) => {
  try {
    const result = await zerodbService.queryRows(TABLE, { limit: 1000, sort: { subscribedAt: -1 } });
    return res.json({ data: result?.data || [], total: result?.total || 0 });
  } catch (err) {
    console.error('Newsletter list error:', err.message);
    return res.json({ data: [], total: 0 });
  }
};

module.exports = { subscribe, list };
