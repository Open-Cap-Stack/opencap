/**
 * Google Analytics 4 event tracking
 *
 * Conversion funnel events for OpenCap Stack:
 *   Landing → Register → Login → Dashboard → Feature usage
 *
 * All events fire via window.gtag() which is loaded in the root layout.
 * Safe to call on server — gtag() is a no-op if not defined.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function gtag(...args) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

// ── Auth funnel ──────────────────────────────────────────────────────────────

export function trackSignUpStart(method = 'email') {
  gtag('event', 'sign_up_start', {
    event_category: 'auth',
    method,
  });
}

export function trackSignUpComplete(method = 'email') {
  gtag('event', 'sign_up', {        // GA4 recommended event
    event_category: 'auth',
    method,
  });
  // Mark as conversion
  if (GA_ID) gtag('event', 'conversion', { send_to: GA_ID, event_category: 'auth', method });
}

export function trackLoginStart(method = 'email') {
  gtag('event', 'login_start', {
    event_category: 'auth',
    method,
  });
}

export function trackLoginComplete(method = 'email') {
  gtag('event', 'login', {          // GA4 recommended event
    event_category: 'auth',
    method,
  });
}

export function trackLoginFailed(method = 'email', reason = '') {
  gtag('event', 'login_failed', {
    event_category: 'auth',
    method,
    reason,
  });
}

export function trackOAuthClick(provider) {
  gtag('event', 'oauth_click', {
    event_category: 'auth',
    provider,
  });
}

export function trackLogout() {
  gtag('event', 'logout', { event_category: 'auth' });
}

// ── Onboarding / activation ──────────────────────────────────────────────────

export function trackOnboardingStep(step, name) {
  gtag('event', 'tutorial_begin', {
    event_category: 'onboarding',
    step_number: step,
    step_name: name,
  });
}

export function trackOnboardingComplete() {
  gtag('event', 'tutorial_complete', { event_category: 'onboarding' });
  if (GA_ID) gtag('event', 'conversion', { send_to: GA_ID, event_category: 'onboarding' });
}

// ── Cap table / core feature usage ──────────────────────────────────────────

export function trackStakeholderAdded() {
  gtag('event', 'stakeholder_added', { event_category: 'cap_table' });
}

export function trackShareClassCreated() {
  gtag('event', 'share_class_created', { event_category: 'cap_table' });
}

export function trackEquityGrantIssued(type) {
  gtag('event', 'equity_grant_issued', { event_category: 'cap_table', grant_type: type });
}

export function trackDocumentUploaded() {
  gtag('event', 'document_uploaded', { event_category: 'documents' });
}

export function trackValuationRequested() {
  gtag('event', 'valuation_requested', { event_category: 'valuations' });
  if (GA_ID) gtag('event', 'conversion', { send_to: GA_ID, event_category: 'valuations' });
}

// ── Billing / subscription ───────────────────────────────────────────────────

export function trackPricingPageView() {
  gtag('event', 'view_item_list', {
    event_category: 'billing',
    item_list_name: 'pricing_plans',
  });
}

export function trackPlanSelected(plan, price) {
  gtag('event', 'select_item', {
    event_category: 'billing',
    item_list_name: 'pricing_plans',
    items: [{ item_id: plan, item_name: plan, price }],
  });
}

export function trackCheckoutStart(plan, price) {
  gtag('event', 'begin_checkout', {
    event_category: 'billing',
    currency: 'USD',
    value: price,
    items: [{ item_id: plan, item_name: plan, price }],
  });
}

export function trackPurchase(plan, price, transactionId) {
  gtag('event', 'purchase', {       // GA4 recommended ecommerce event
    event_category: 'billing',
    transaction_id: transactionId,
    value: price,
    currency: 'USD',
    items: [{ item_id: plan, item_name: plan, price }],
  });
  if (GA_ID) gtag('event', 'conversion', { send_to: GA_ID, value: price, currency: 'USD' });
}

// ── Engagement / funnel drop-off signals ────────────────────────────────────

export function trackPageView(path, title) {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  });
}

export function trackCTAClick(label, location) {
  gtag('event', 'cta_click', {
    event_category: 'engagement',
    cta_label: label,
    cta_location: location,
  });
}

export function trackFeatureDiscovered(feature) {
  gtag('event', 'feature_discovered', {
    event_category: 'engagement',
    feature_name: feature,
  });
}

export function trackFunnelAbandonment(step) {
  gtag('event', 'funnel_abandonment', {
    event_category: 'funnel',
    funnel_step: step,
  });
}

export function trackSearch(query) {
  gtag('event', 'search', {         // GA4 recommended event
    event_category: 'engagement',
    search_term: query,
  });
}

export function trackError(errorType, message) {
  gtag('event', 'error', {
    event_category: 'errors',
    error_type: errorType,
    error_message: message,
  });
}
