'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export default function CheckoutCancelPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-10 text-center transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <XCircle size={44} className="text-gray-400" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout Cancelled</h1>
        <p className="text-gray-500 text-sm mb-8">
          No charges were made. You can return to the billing page whenever you are ready to upgrade.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/billing"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <CreditCard size={16} />
            Back to Billing
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
