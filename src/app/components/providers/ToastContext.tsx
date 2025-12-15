"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Toast } from "../ui/Toast";

interface ToastContextType {
    showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; isVisible: boolean }>({
        message: "",
        isVisible: false,
    });

    const showError = useCallback((message: string) => {
        setToast({ message, isVisible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
    }, []);

    return (
        <ToastContext.Provider value={{ showError }}>
            {children}
            <Toast
                message={toast.message}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
