"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { postLiveEvent } from "../lib/eventSync";
import { useRemoteControlListener } from "../lib/remoteControl";
import { useToast } from "../components/providers/ToastContext";

export default function CaptchaPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "ready" | "solving" | "solved" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [lastClick, setLastClick] = useState<{ x: number, y: number } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { showError } = useToast();

    useRemoteControlListener({ onToast: (msg) => showError(msg) });

    // Handle click on captcha image
    const handleClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || status !== 'solving') return;

        const rect = imageRef.current.getBoundingClientRect();
        const scaleX = imageRef.current.naturalWidth / rect.width;
        const scaleY = imageRef.current.naturalHeight / rect.height;

        // Calculate click position relative to actual screenshot dimensions
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);

        console.log(`🖱️ Click at (${x}, ${y})`);
        setLastClick({ x, y });
        postLiveEvent('user_captcha_click', { x, y });

        // Send click to automation
        try {
            await fetch('/api/captcha-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y, type: 'click' })
            });
        } catch (e) {
            console.error('Failed to send click:', e);
        }
    }, [status]);

    // Poll for screenshot and automation status
    useEffect(() => {
        let isActive = true;
        let screenshotInterval: NodeJS.Timeout;

        const pollStatus = async () => {
            if (!isActive) return;

            try {
                const res = await fetch('/api/automation-status');
                const data = await res.json();

                // When captcha detected, start streaming
                if (data.status === 'captcha') {
                    setStatus("solving");
                }

                setTimeout(pollStatus, 300);
            } catch (e) {
                if (isActive) setTimeout(pollStatus, 1000);
            }
        };

        const pollScreenshot = async () => {
            if (!isActive) return;

            try {
                const res = await fetch('/api/captcha-stream');
                const data = await res.json();

                if (data.success && data.image) {
                    setScreenshot(data.image);
                    if (status === 'loading') {
                        setStatus("ready");
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        };

        pollStatus();

        // Start screenshot polling at 100ms (10 FPS)
        screenshotInterval = setInterval(pollScreenshot, 100);

        return () => {
            isActive = false;
            clearInterval(screenshotInterval);
        };
    }, [router, status]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "#1a1d1f" }}>
            {/* Header - Only show when not solving */}
            {status !== 'solving' && (
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2d30" }}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="#24EE89" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24.1085 6.2924L17.2892 3.73825C16.5824 3.47788 15.4293 3.47788 14.7226 3.73825L7.90327 6.2924C6.589 6.78835 5.52271 8.3258 5.52271 9.72686V19.7699C5.52271 20.7742 6.17984 22.1009 6.98576 22.696L13.8051 27.7919C15.0078 28.697 16.9792 28.697 18.1819 27.7919L25.0012 22.696C25.8071 22.0885 26.4643 20.7742 26.4643 19.7699V9.72686C26.4767 8.3258 25.4104 6.78835 24.1085 6.2924ZM16.9296 17.0793V20.3402C16.9296 20.8486 16.508 21.2701 15.9997 21.2701C15.4913 21.2701 15.0698 20.8486 15.0698 20.3402V17.0793C13.8175 16.6826 12.9 15.5171 12.9 14.1408C12.9 12.4298 14.2886 11.0411 15.9997 11.0411C17.7107 11.0411 19.0994 12.4298 19.0994 14.1408C19.0994 15.5295 18.1819 16.6826 16.9296 17.0793Z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Security Verification</h1>
                    <p className="text-gray-400 text-sm">
                        {status === 'loading' && 'Loading verification...'}
                        {status === 'ready' && 'Click below to complete verification'}
                        {status === 'solved' && '✓ Verification successful!'}
                        {status === 'error' && errorMessage}
                    </p>
                </div>
            )}

            {/* Loading state */}
            {status === 'loading' && !screenshot && (
                <div className="flex items-center justify-center gap-3 text-gray-400">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading captcha...</span>
                </div>
            )}

            {/* Live Captcha Screenshot */}
            {(status === 'solving' || status === 'ready') && screenshot && (
                <div
                    ref={containerRef}
                    onClick={handleClick}
                    className="relative cursor-pointer select-none"
                    style={{
                        maxWidth: '100%',
                        maxHeight: '80vh'
                    }}
                >
                    <img
                        ref={imageRef}
                        src={screenshot}
                        alt="Captcha"
                        draggable={false}
                        className="rounded-lg shadow-2xl"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '80vh',
                            objectFit: 'contain'
                        }}
                    />

                    {/* Click indicator */}
                    {lastClick && (
                        <div
                            className="absolute w-6 h-6 rounded-full border-2 border-green-400 bg-green-400/30 animate-ping"
                            style={{
                                left: `${(lastClick.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                                top: `${(lastClick.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        />
                    )}

                    {/* Instructions overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                        <p className="text-white text-center text-sm">
                            👆 Click on the captcha to solve it
                        </p>
                    </div>
                </div>
            )}

            {/* Solved state */}
            {status === 'solved' && (
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-500/20">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#24EE89">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </div>
                    <p className="text-green-400 text-lg font-semibold">Verified!</p>
                    <p className="text-gray-500 text-sm mt-1">Redirecting...</p>
                </div>
            )}

            {/* Error state */}
            {status === 'error' && (
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/20">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#EF4444">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </div>
                    <p className="text-red-400">{errorMessage || 'Error occurred'}</p>
                    <p className="text-gray-500 text-xs mt-1">Redirecting back...</p>
                </div>
            )}

            {/* Back Button */}
            {status !== 'solving' && (
                <button
                    onClick={() => router.push('/')}
                    className="mt-6 text-gray-400 text-sm hover:text-white transition-colors"
                >
                    ← Go back
                </button>
            )}
        </div>
    );
}
