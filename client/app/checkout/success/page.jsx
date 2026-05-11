'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
      {/* Confetti dots — purely CSS, no library needed */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              width: `${6 + (i % 5) * 3}px`,
              height: `${6 + (i % 5) * 3}px`,
              top: `${5 + (i * 13) % 60}%`,
              left: `${(i * 17 + 7) % 95}%`,
              background: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'][i % 6],
              animationDelay: `${(i * 0.15).toFixed(2)}s`,
              animationDuration: `${1.2 + (i % 4) * 0.3}s`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <div
        className={`relative z-10 bg-white rounded-3xl shadow-2xl border border-green-100 max-w-md w-full p-10 text-center transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Icon with pulse ring */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-50" />
            <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={44} className="text-green-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Your plan has been upgraded. You now have access to all the features included in your new subscription.
        </p>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-8 text-left space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-800 font-semibold">
            <Zap size={14} className="text-green-600" />
            What happens next
          </div>
          <ul className="space-y-1.5 pl-1">
            {[
              'Your new limits are active immediately',
              'A receipt has been sent to your email',
              'Your billing cycle starts today',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-xs text-green-700">
                <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
          <ArrowRight size={16} />
        </Link>

        <Link
          href="/billing"
          className="block mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          View billing details
        </Link>
      </div>
    </div>
  );
}
