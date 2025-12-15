'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface TelegramContextType {
    webApp: any;
    user: any;
    isReady: boolean;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: ReactNode }) {
    const [webApp, setWebApp] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const app = (window as any).Telegram?.WebApp;
        if (app) {
            app.ready();
            app.expand();

            // Set theme colors to match our dark theme
            app.setHeaderColor('#232626');
            app.setBackgroundColor('#232626');

            // Disable vertical swipes if supported
            if (app.disableVerticalSwipes) {
                app.disableVerticalSwipes();
            }

            // Enable closing confirmation
            if (app.enableClosingConfirmation) {
                app.enableClosingConfirmation();
            }

            // Handle viewport height
            const setViewportHeight = () => {
                const vh = app.viewportStableHeight || window.innerHeight;
                document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
                document.documentElement.style.setProperty('--tg-viewport-stable-height', `${app.viewportStableHeight || vh}px`);
            };

            setViewportHeight();
            app.onEvent('viewportChanged', setViewportHeight);

            // Set safe area insets
            if (app.safeAreaInset) {
                document.documentElement.style.setProperty('--safe-top', `${app.safeAreaInset.top || 0}px`);
                document.documentElement.style.setProperty('--safe-bottom', `${app.safeAreaInset.bottom || 0}px`);
            }

            setWebApp(app);
            setIsReady(true);
            setUser(app.initDataUnsafe?.user);
        }
    }, []);

    return (
        <TelegramContext.Provider value={{ webApp, user, isReady }}>
            {children}
        </TelegramContext.Provider>
    );
}

export function useTelegram() {
    const context = useContext(TelegramContext);
    if (context === undefined) {
        // Return a mock context if used outside provider (e.g. during dev in browser)
        return {
            webApp: null,
            user: null,
            isReady: false
        };
    }
    return context;
}
