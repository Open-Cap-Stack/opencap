'use client';

import { useState, useEffect } from 'react';
import {
  Github,
  Slack,
  HardDrive,
  Zap,
  BookOpen,
  FileSignature,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Plug,
  Unplug,
} from 'lucide-react';
import api from '@/lib/api';

const CATEGORIES = ['All', 'Communication', 'Storage', 'Auth', 'Analytics', 'Developer'];

const INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Sync equity grants with GitHub org members and manage team access.',
    category: 'Developer',
    icon: Github,
    iconBg: 'bg-gray-900',
    iconColor: 'text-white',
    status: 'available',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get cap table notifications and alerts directly in your Slack workspace.',
    category: 'Communication',
    icon: Slack,
    iconBg: 'bg-purple-600',
    iconColor: 'text-white',
    status: 'available',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Automatically sync documents and reports to Google Drive.',
    category: 'Storage',
    icon: HardDrive,
    iconBg: 'bg-green-600',
    iconColor: 'text-white',
    status: 'available',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate cap table workflows by connecting to 5,000+ apps via Zapier.',
    category: 'Developer',
    icon: Zap,
    iconBg: 'bg-orange-500',
    iconColor: 'text-white',
    status: 'coming_soon',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync financials and equity data directly to QuickBooks.',
    category: 'Analytics',
    icon: BookOpen,
    iconBg: 'bg-green-500',
    iconColor: 'text-white',
    status: 'coming_soon',
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    description: 'E-sign option agreements, grants, and other documents in one click.',
    category: 'Auth',
    icon: FileSignature,
    iconBg: 'bg-yellow-500',
    iconColor: 'text-white',
    status: 'coming_soon',
  },
];

function IntegrationIcon({ icon: Icon, iconBg, iconColor }) {
  return (
    <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
      <Icon size={20} className={iconColor} />
    </div>
  );
}

function ConnectModal({ integration, onClose, onConnect, connecting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IntegrationIcon icon={integration.icon} iconBg={integration.iconBg} iconColor={integration.iconColor} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Connect {integration.name}</h2>
              <p className="text-xs text-gray-500">{integration.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            Connecting <strong>{integration.name}</strong> will allow OpenCap Stack to:
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-start gap-2 text-sm text-blue-700">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-blue-500" />
              Read and write data on your behalf
            </li>
            <li className="flex items-start gap-2 text-sm text-blue-700">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-blue-500" />
              Send notifications and updates
            </li>
            <li className="flex items-start gap-2 text-sm text-blue-700">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-blue-500" />
              Sync data automatically in the background
            </li>
          </ul>
        </div>

        <p className="text-xs text-gray-500">
          You can disconnect this integration at any time from the Integrations page. We will never share your data with third parties.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConnect(integration.id)}
            disabled={connecting}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [connected, setConnected] = useState([]);
  const [loadingConnected, setLoadingConnected] = useState(true);
  const [modalIntegration, setModalIntegration] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchConnected() {
      try {
        const res = await api.get('/integrations/connected');
        setConnected(res.data?.integrations ?? res.data ?? []);
      } catch {
        // Endpoint may not exist yet — treat as empty
        setConnected([]);
      } finally {
        setLoadingConnected(false);
      }
    }
    fetchConnected();
  }, []);

  const filtered = activeCategory === 'All'
    ? INTEGRATIONS
    : INTEGRATIONS.filter((i) => i.category === activeCategory);

  const connectedIds = new Set(connected.map((c) => c.id ?? c.integrationId));

  async function handleConnect(integrationId) {
    setConnecting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.post('/integrations/connect', { integrationId });
      const redirectUrl = res.data?.redirectUrl ?? res.data?.authUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      // Optimistically add to connected list
      const integration = INTEGRATIONS.find((i) => i.id === integrationId);
      setConnected((prev) => [...prev, { id: integrationId, name: integration?.name }]);
      setMessage({ type: 'success', text: `${integration?.name ?? integrationId} connected successfully.` });
      setModalIntegration(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to connect integration. Please try again.' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect(integrationId) {
    setDisconnecting(integrationId);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/integrations/disconnect', { integrationId });
      setConnected((prev) => prev.filter((c) => (c.id ?? c.integrationId) !== integrationId));
      const integration = INTEGRATIONS.find((i) => i.id === integrationId);
      setMessage({ type: 'success', text: `${integration?.name ?? integrationId} disconnected.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to disconnect. Please try again.' });
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connect OpenCap Stack with the tools your team already uses.</p>
      </div>

      {message.text && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0 text-green-600" /> : <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto text-current opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Connected integrations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plug size={16} className="text-green-600" />
          Connected
        </h2>
        {loadingConnected ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : connected.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Unplug size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No integrations connected yet.</p>
            <p className="text-xs mt-1">Connect an integration below to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {connected.map((conn) => {
              const meta = INTEGRATIONS.find((i) => i.id === (conn.id ?? conn.integrationId));
              const Icon = meta?.icon ?? Plug;
              return (
                <div key={conn.id ?? conn.integrationId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {meta ? (
                      <IntegrationIcon icon={meta.icon} iconBg={meta.iconBg} iconColor={meta.iconColor} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Icon size={20} className="text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{conn.name ?? meta?.name}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Connected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id ?? conn.integrationId)}
                    disabled={disconnecting === (conn.id ?? conn.integrationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {disconnecting === (conn.id ?? conn.integrationId) ? <Loader2 size={12} className="animate-spin" /> : <Unplug size={12} />}
                    Disconnect
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Marketplace */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Marketplace</h2>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Integration cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((integration) => {
            const isConnected = connectedIds.has(integration.id);
            const isComingSoon = integration.status === 'coming_soon';
            return (
              <div
                key={integration.id}
                className={`bg-white rounded-xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${isConnected ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <IntegrationIcon icon={integration.icon} iconBg={integration.iconBg} iconColor={integration.iconColor} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{integration.name}</p>
                      <span className="text-xs text-gray-400">{integration.category}</span>
                    </div>
                  </div>
                  {isComingSoon && (
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      Coming Soon
                    </span>
                  )}
                  {isConnected && !isComingSoon && (
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Connected
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 flex-1">{integration.description}</p>

                <div>
                  {isComingSoon ? (
                    <button disabled className="w-full py-2 border border-gray-200 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed">
                      Coming Soon
                    </button>
                  ) : isConnected ? (
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={disconnecting === integration.id}
                      className="flex items-center justify-center gap-1.5 w-full py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {disconnecting === integration.id ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => setModalIntegration(integration)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plug size={14} />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connect modal */}
      {modalIntegration && (
        <ConnectModal
          integration={modalIntegration}
          onClose={() => {
            if (!connecting) setModalIntegration(null);
          }}
          onConnect={handleConnect}
          connecting={connecting}
        />
      )}
    </div>
  );
}
