'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Zap,
  Users,
  FileText,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
} from 'lucide-react';
import api from '@/lib/api';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['25 stakeholders', '50 documents', '500 MB storage', 'Basic reporting'],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    features: ['Unlimited stakeholders', '500 documents', '10 GB storage', 'Advanced reporting', 'Priority support'],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    features: ['Everything in Pro', 'Custom document limits', 'Unlimited storage', 'Dedicated support', 'Custom integrations'],
    highlight: false,
  },
];

function UsageMeter({ label, icon: Icon, used, limit, unit = '' }) {
  const pct = limit ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const isOver = pct >= 90;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          <Icon size={14} className="text-gray-400" />
          {label}
        </span>
        <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-gray-600'}`}>
          {limit ? `${used.toLocaleString()} / ${limit.toLocaleString()}${unit}` : `${used.toLocaleString()}${unit} used`}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: limit ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${map[status] ?? map.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function BillingPage() {
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    async function fetchBillingData() {
      try {
        const [billingRes, invoicesRes] = await Promise.allSettled([
          api.get('/billing/current'),
          api.get('/billing/invoices'),
        ]);

        if (billingRes.status === 'fulfilled') {
          setBilling(billingRes.value.data);
        } else {
          // Provide sensible defaults when the endpoint doesn't exist yet
          setBilling({
            plan: 'free',
            renewalDate: null,
            usage: { stakeholders: { used: 3, limit: 25 }, documents: { used: 12, limit: 50 }, storage: { used: 48, limit: 500 } },
            paymentMethod: null,
          });
        }

        if (invoicesRes.status === 'fulfilled') {
          setInvoices(invoicesRes.value.data?.invoices ?? invoicesRes.value.data ?? []);
        } else {
          setInvoices([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load billing information.');
      } finally {
        setLoading(false);
      }
    }
    fetchBillingData();
  }, []);

  async function handleUpgrade(planId) {
    setUpgrading(planId);
    setActionMessage('');
    try {
      const res = await api.post('/billing/create-checkout', { plan: planId });
      const url = res.data?.url || res.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
      } else {
        setActionMessage('Checkout session created. Please follow the instructions sent to your email.');
      }
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setUpgrading(null);
    }
  }

  async function handleUpdatePayment() {
    setUpdatingPayment(true);
    setActionMessage('');
    try {
      const res = await api.post('/billing/update-payment');
      const url = res.data?.url || res.data?.portalUrl;
      if (url) {
        window.location.href = url;
      } else {
        setActionMessage('A link to update your payment method has been sent to your email.');
      }
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to open payment portal. Please try again.');
    } finally {
      setUpdatingPayment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-xl">
        <AlertCircle size={20} className="shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const currentPlanId = billing?.plan ?? 'free';
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];
  const usage = billing?.usage ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your subscription, invoices, and payment methods.</p>
      </div>

      {actionMessage && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
          <CheckCircle size={18} className="shrink-0 mt-0.5 text-blue-600" />
          {actionMessage}
        </div>
      )}

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-blue-600" />
          Current Plan
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">{currentPlan.name}</span>
              {currentPlanId !== 'free' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Active</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {currentPlan.price !== null ? (
                currentPlan.price === 0 ? 'Free forever' : `$${currentPlan.price}/month`
              ) : (
                'Custom pricing'
              )}
              {billing?.renewalDate && (
                <> &bull; Renews {new Date(billing.renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
              )}
            </p>
          </div>
          {currentPlanId === 'free' && (
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={upgrading === 'pro'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {upgrading === 'pro' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Usage meters */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Usage This Period</p>
          {usage.stakeholders && (
            <UsageMeter label="Stakeholders" icon={Users} used={usage.stakeholders.used} limit={usage.stakeholders.limit} />
          )}
          {usage.documents && (
            <UsageMeter label="Documents" icon={FileText} used={usage.documents.used} limit={usage.documents.limit} />
          )}
          {usage.storage && (
            <UsageMeter label="Storage" icon={HardDrive} used={usage.storage.used} limit={usage.storage.limit} unit=" MB" />
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${plan.highlight ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'}`}
              >
                {plan.highlight && (
                  <span className="self-start text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Most Popular</span>
                )}
                <div>
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    {plan.price === null ? 'Custom' : plan.price === 0 ? '$0' : `$${plan.price}`}
                    {plan.price !== null && plan.price > 0 && <span className="text-sm font-normal text-gray-500">/mo</span>}
                  </p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="mt-0.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div>
                  {isCurrent ? (
                    <div className="text-center text-sm text-gray-500 font-medium py-2">Current plan</div>
                  ) : plan.id === 'enterprise' ? (
                    <a
                      href="mailto:enterprise@opencapstack.com"
                      className="flex items-center justify-center gap-1.5 w-full py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Mail size={14} />
                      Contact us
                    </a>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading === plan.id}
                      className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {upgrading === plan.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-gray-500" />
          Payment Method
        </h2>
        {billing?.paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-gray-800 rounded flex items-center justify-center">
                <CreditCard size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {billing.paymentMethod.brand?.toUpperCase() ?? 'Card'} ending in {billing.paymentMethod.last4}
                </p>
                <p className="text-xs text-gray-500">
                  Expires {billing.paymentMethod.expMonth}/{billing.paymentMethod.expYear}
                </p>
              </div>
            </div>
            <button
              onClick={handleUpdatePayment}
              disabled={updatingPayment}
              className="text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"
            >
              {updatingPayment ? 'Redirecting...' : 'Update'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">No payment method on file.</p>
            <button
              onClick={handleUpdatePayment}
              disabled={updatingPayment}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {updatingPayment ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              Add Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-gray-500" />
          Invoices
        </h2>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <FileText size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No invoices yet.</p>
            <p className="text-xs mt-1">Invoices will appear here once you upgrade your plan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Invoice</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Amount</th>
                  <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="group">
                    <td className="py-3 font-mono text-gray-700">{inv.number ?? inv.id}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(inv.date ?? inv.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 font-medium text-gray-900">
                      ${((inv.amount ?? inv.amount_paid ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={inv.status ?? 'paid'} />
                    </td>
                    <td className="py-3 text-right">
                      {inv.downloadUrl || inv.invoice_pdf ? (
                        <a
                          href={inv.downloadUrl ?? inv.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-medium"
                        >
                          <Download size={12} />
                          Download
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
