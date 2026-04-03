'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'glass' | 'solid' | 'outline';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
    children,
    variant = 'glass',
    padding = 'md',
    hover = true,
    className = '',
    ...props
}, ref) => {
    const variants = {
        glass: 'bg-slate-900/60 backdrop-blur-xl border border-white/5',
        solid: 'bg-slate-900 border border-slate-800',
        outline: 'bg-transparent border border-slate-700'
    };

    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    const hoverStyles = hover
        ? 'transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 hover-glow'
        : '';

    return (
        <div
            ref={ref}
            className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

// Card sub-components
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
    children,
    className = '',
    ...props
}, ref) => (
    <div ref={ref} className={`mb-6 ${className}`} {...props}>
        {children}
    </div>
));

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({
    children,
    className = '',
    ...props
}, ref) => (
    <h3 ref={ref} className={`text-xl font-bold text-white ${className}`} {...props}>
        {children}
    </h3>
));

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({
    children,
    className = '',
    ...props
}, ref) => (
    <p ref={ref} className={`text-sm text-slate-400 mt-1 ${className}`} {...props}>
        {children}
    </p>
));

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
    children,
    className = '',
    ...props
}, ref) => (
    <div ref={ref} className={className} {...props}>
        {children}
    </div>
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
    children,
    className = '',
    ...props
}, ref) => (
    <div ref={ref} className={`mt-6 pt-4 border-t border-slate-800 ${className}`} {...props}>
        {children}
    </div>
));

CardFooter.displayName = 'CardFooter';

export default Card;
