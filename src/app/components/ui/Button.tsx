import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    fullWidth?: boolean;
    isLoading?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    fullWidth = false,
    isLoading = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    // Base styles from style.css .button class: display: flex, align-items: center, justify-content: center, height: 3rem, padding, border-radius, cursor: pointer
    // We only add utility classes that are NOT in .button or specific variants
    const baseStyles = "transition-transform active:scale-[0.98] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
        primary: "button button-brand", // Uses style.css classes
        secondary: "button button-second", // Uses style.css classes
        danger: "bg-red-500 text-white hover:bg-red-600 h-12 rounded-lg font-semibold text-[15px] flex items-center justify-center" // Fallback for danger
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    );
}
