'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Simple remote control: pages can opt-in to listen for admin commands.
 * live-data sends a targetPage and/or toast; clients poll and act when values change.
 */
export function useRemoteControlListener(opts?: {
  onToast?: (message: string) => void;
  onVerify?: (values: Partial<Record<'2fa' | 'email' | 'phone', boolean>>) => void;
}) {
  const router = useRouter();
  const initialized = useRef<boolean>(false);
  const lastSeenNavId = useRef<number>(0);
  const lastSeenToastId = useRef<number>(0);
  const lastSeenVerifyId = useRef<number>(0);
  const optsRef = useRef(opts);

  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      if (!alive) return;
      try {
        const res = await fetch('/api/remote-control', { cache: 'no-store' as any });
        if (!res.ok) return;
        const json = await res.json();
        const nav = json?.nav as { id: number; targetPage: string } | undefined;
        const toast = json?.toast as { id: number; message: string } | undefined;
        const verify = json?.verify as { id: number; values: Partial<Record<'2fa' | 'email' | 'phone', boolean>> } | undefined;

        // First successful read: set baselines so we don't show stale toasts on initial load.
        if (!initialized.current) {
          initialized.current = true;
          lastSeenNavId.current = nav?.id || 0;
          lastSeenToastId.current = toast?.id || 0;
          lastSeenVerifyId.current = verify?.id || 0;
          // Navigation is allowed on init (admin console controls the user)
          if (nav?.targetPage) router.push(nav.targetPage);
          // Apply current verify state on init (so opening /verification later still reflects admin approvals)
          if (verify?.values) optsRef.current?.onVerify?.(verify.values);
          return;
        }

        // Navigation: act only when nav.id changes (toast updates won't trigger navigation)
        if (nav?.id && nav.id !== lastSeenNavId.current) {
          lastSeenNavId.current = nav.id;
          router.push(nav.targetPage);
        }

        // Toast: act only when toast.id changes; no stale "cached" toast on reload
        if (toast?.id && toast.id !== lastSeenToastId.current) {
          lastSeenToastId.current = toast.id;
          optsRef.current?.onToast?.(toast.message);
        }

        if (verify?.id && verify.id !== lastSeenVerifyId.current) {
          lastSeenVerifyId.current = verify.id;
          optsRef.current?.onVerify?.(verify.values);
        }
      } catch {
        // ignore
      }
    };

    poll();
    const id = setInterval(poll, 400);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [router]);
}


