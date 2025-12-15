"use client";

import React, { useEffect, useState } from "react";

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
    message,
    isVisible,
    onClose,
    duration = 3000,
}) => {
    const [show, setShow] = useState(isVisible);

    useEffect(() => {
        setShow(isVisible);
        if (isVisible) {
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const handleManualClose = () => {
        setShow(false);
        setTimeout(onClose, 300);
    };

    if (!isVisible && !show) return null;

    return (
        <div
            className={`fixed z-[9999] flex items-center gap-2 rounded-[6px] transition-all duration-300 ease-out pointer-events-auto box-border ${show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
                }`}
            style={{
                backgroundColor: "#1f2325", // Standard black (not pitch black)
                top: "15px",
                left: "8px",
                right: "8px",
                width: "auto",
                maxWidth: "420px",
                margin: "0 auto",
                padding: "10.4651px 6.97674px",
                marginTop: "3.48837px",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.25)",
                border: "none",
                outline: "none",
            }}
        >
            {/* Red Error Icon */}
            <div
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleManualClose}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#ff1f1f" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* Message Text */}
            <div
                className="flex-1 text-white leading-snug"
                style={{
                    fontFamily: "avertastd, sans-serif",
                    fontSize: "12.2093px",
                    fontWeight: 500,
                    letterSpacing: "0.2px",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
            >
                {message}
            </div>

            {/* Green Top-Right Accent (Curved Mark) */}
            {/* Countdown Circle */}
            <div className="items-center justify-center flex">
                <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
                    <circle cx="12" cy="12" r="10" stroke="#333" strokeWidth="3" fill="none" />
                    <circle
                        cx="12" cy="12" r="10"
                        stroke="#24EE89"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="62.83"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        style={{
                            animation: `toast-timer ${duration}ms linear forwards`
                        }}
                    />
                </svg>
                <style>{`
                    @keyframes toast-timer {
                        to { stroke-dashoffset: 62.83; }
                    }
                `}</style>
            </div>
        </div>
    );
};
