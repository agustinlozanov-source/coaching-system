'use client';

import React, { forwardRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface GlowButtonProps {
  label?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  /** Icono a la derecha; por defecto Sparkles. */
  icon?: React.ReactNode;
}

/** Botón con glow teal institucional + animación de clic. Para acciones de crear/generar. */
export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ label = 'Generar', children, onClick, className, disabled, loading, type = 'button', icon }, ref) => {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = () => {
      if (disabled || loading) return;
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
      onClick?.();
    };

    const content = children ?? label;

    return (
      <button
        ref={ref}
        type={type}
        aria-label={typeof content === 'string' ? content : label}
        className={cn('glow-btn', className)}
        onClick={handleClick}
        disabled={disabled || loading}
        data-state={isClicked ? 'clicked' : undefined}
      >
        <span className="flex items-center justify-center gap-1.5">
          {content}
          {loading ? <Loader2 size={16} className="ml-0.5 animate-spin" /> : (icon ?? <Sparkles size={16} className="ml-0.5" />)}
        </span>
      </button>
    );
  }
);

GlowButton.displayName = 'GlowButton';

// Alias para compatibilidad con el snippet original.
export const Component = GlowButton;
