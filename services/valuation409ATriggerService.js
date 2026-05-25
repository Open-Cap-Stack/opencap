/**
 * 409A Valuation Trigger Service
 * Issue #654: Automatic 409A trigger detection
 *
 * Detects conditions that require a new 409A valuation:
 * - 12+ months since last 409A
 * - New funding round
 * - New share class created
 *
 * Integrates with alertService to send alerts when triggers fire.
 */

const STALENESS_THRESHOLD_MONTHS = 12;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Check if a given 409A valuation date is stale (>12 months old).
 *
 * @param {string|null} lastValuationDateIso
 * @returns {{ isStale: boolean, monthsOld: number, daysRemaining: number, triggerReason: string }}
 */
function checkStaleness(lastValuationDateIso) {
  if (!lastValuationDateIso) {
    return {
      isStale: true,
      monthsOld: Infinity,
      daysRemaining: 0,
      triggerReason: 'No 409A valuation on record'
    };
  }

  const lastDate = new Date(lastValuationDateIso);
  const now = new Date();
  const diffMs = now - lastDate;
  const diffDays = diffMs / MS_PER_DAY;
  const diffMonths = diffDays / 30.44;

  const thresholdDays = STALENESS_THRESHOLD_MONTHS * 30.44;
  const daysRemaining = Math.max(0, Math.round(thresholdDays - diffDays));

  const isStale = diffMonths >= STALENESS_THRESHOLD_MONTHS;

  return {
    isStale,
    monthsOld: parseFloat(diffMonths.toFixed(1)),
    daysRemaining,
    triggerReason: isStale
      ? `409A valuation is ${diffMonths.toFixed(1)} months old — exceeds 12 months threshold`
      : null
  };
}

/**
 * Trigger event types that require a new 409A
 */
const TRIGGER_EVENT_TYPES = new Set(['funding_round', 'new_share_class', 'last_409a']);

/**
 * Detect trigger events that require a new 409A valuation.
 *
 * @param {Array<{ type: string, date: string, details: object }>} events
 * @returns {Array<{ type: string, date: string, requiresNewValuation: boolean, description: string }>}
 */
function detectTriggers(events) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const triggers = [];

  for (const event of events) {
    if (event.type === 'funding_round') {
      triggers.push({
        type: 'funding_round',
        date: event.date,
        requiresNewValuation: true,
        description: `New funding round detected: ${event.details?.round || 'unknown'}`
      });
    } else if (event.type === 'new_share_class') {
      triggers.push({
        type: 'new_share_class',
        date: event.date,
        requiresNewValuation: true,
        description: `New share class created: ${event.details?.className || 'unknown'}`
      });
    } else if (event.type === 'last_409a') {
      const staleness = checkStaleness(event.date);
      if (staleness.isStale) {
        triggers.push({
          type: 'staleness',
          date: event.date,
          requiresNewValuation: true,
          description: staleness.triggerReason
        });
      }
    }
  }

  return triggers;
}

/**
 * Map months old / trigger count to urgency level
 */
function getUrgency(monthsOld, triggerCount) {
  if (monthsOld > 24 || triggerCount > 1) return 'critical';
  if (monthsOld > 12 || triggerCount === 1) return 'high';
  if (monthsOld > 9) return 'medium';
  return 'low';
}

/**
 * Full staleness analysis for a company.
 *
 * @param {{ companyId: string, lastValuationDate: string|null, recentEvents: Array }} companyData
 * @returns {Promise<Object>}
 */
async function analyzeStaleness(companyData) {
  const { companyId, lastValuationDate, recentEvents = [] } = companyData;

  const stalenessCheck = checkStaleness(lastValuationDate);

  // Also check for staleness through events
  const eventsWithLast409a = stalenessCheck.isStale && lastValuationDate
    ? [...recentEvents, { type: 'last_409a', date: lastValuationDate, details: {} }]
    : recentEvents;

  const triggers = detectTriggers(eventsWithLast409a);

  const isStale = stalenessCheck.isStale || triggers.length > 0;
  const urgency = isStale
    ? getUrgency(stalenessCheck.monthsOld, triggers.length)
    : 'low';

  let recommendedAction = 'none';
  if (triggers.length > 0 || stalenessCheck.isStale) {
    recommendedAction = 'initiate_409a_valuation';
  }

  return {
    companyId,
    isStale,
    staleness: stalenessCheck,
    triggers,
    urgency,
    recommendedAction,
    checkedAt: new Date().toISOString()
  };
}

module.exports = { checkStaleness, detectTriggers, analyzeStaleness };
