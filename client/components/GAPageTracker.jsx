'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Tracks page views in GA4 on every route change.
 * Must be rendered inside <Suspense> because useSearchParams() requires it.
 */
export function GAPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.gtag('event', 'page_view', {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}
