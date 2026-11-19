// src/components/ui/AnimatedComponents.jsx
// Componentes de animación reutilizables para mantener identidad visual coherente

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  staggerContainerVariants,
  staggerItemVariants
} from './animationVariants';

// Componente contenedor con animación de entrada escalonada
export const StaggerContainer = ({ children, className = '', variants = staggerContainerVariants, ...props }) => (
  <motion.div className={className} variants={variants} {...props}>
    {React.Children.map(children, (child, index) => 
      React.isValidElement(child) 
        ? React.cloneElement(child, { key: child.key || index })
        : child
    )}
  </motion.div>
);

export const StaggerItem = ({ children, className = '', variants = staggerItemVariants, ...props }) => (
  <motion.div className={className} variants={variants} {...props}>
    {children}
  </motion.div>
);

// FadeIn simple
export const FadeIn = ({ children, className = '', duration = 0.2, delay = 0, ...props }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration, delay }}
    {...props}
  >
    {children}
  </motion.div>
);

// SlideUp para contenido principal
export const SlideUp = ({ children, className = '', duration = 0.3, delay = 0, ...props }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration, delay, ease: 'easeOut' }}
    {...props}
  >
    {children}
  </motion.div>
);

// ScaleIn para tarjetas y modales
export const ScaleIn = ({ children, className = '', duration = 0.2, delay = 0, ...props }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration, delay, ease: 'easeOut' }}
    {...props}
  >
    {children}
  </motion.div>
);

// SlideIn desde la izquierda (para sidebar, drawers)
export const SlideInLeft = ({ children, className = '', isOpen, duration = 0.3, ...props }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className={className}
        initial={{ opacity: 0, x: -300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ duration, ease: 'easeOut' }}
        {...props}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// SlideIn desde la derecha
export const SlideInRight = ({ children, className = '', isOpen, duration = 0.3, ...props }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className={className}
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration, ease: 'easeOut' }}
        {...props}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// Modal/Dialog animado
export const AnimatedModal = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  className = '',
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`${sizeClasses[size]} w-full bg-white rounded-xl shadow-xl overflow-hidden ${className}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            {title && (
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 id="modal-title" className="text-lg font-semibold text-gray-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  aria-label="Cerrar modal"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Tarjeta con hover lift
export const AnimatedCard = ({ 
  children, 
  className = '', 
  hover = true, 
  onClick,
  as: Component = 'div',
  ...props 
}) => (
  <motion.div
    className={`${className} bg-white rounded-xl border border-gray-200 ${hover ? 'hover-lift cursor-pointer' : ''}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={hover ? { y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' } : undefined}
    whileTap={hover ? { scale: 0.98 } : undefined}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    onClick={onClick}
    {...props}
  >
    <Component className="p-6">{children}</Component>
  </motion.div>
);

// Botón animado
export const AnimatedButton = ({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <motion.button
      className={`${variants[variant]} ${sizes[size]} font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : undefined}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </motion.button>
  );
};

// Skeleton loader animado
export const Skeleton = ({ className = '', variant = 'text', lines = 1 }) => {
  const baseClass = 'animate-shimmer bg-gray-200 rounded';
  
  if (variant === 'circular') {
    return <div className={`${baseClass} h-12 w-12 rounded-full ${className}`} />;
  }
  
  if (variant === 'card') {
    return (
      <div className={`${className} space-y-4`}>
        <div className={`${baseClass} h-40 w-full`} />
        <div className={`${baseClass} h-6 w-3/4`} />
        <div className={`${baseClass} h-4 w-1/2`} />
        <div className={`${baseClass} h-4 w-1/3`} />
      </div>
    );
  }
  
  return (
    <div className={`${className} space-y-2`}>
      {[...Array(lines)].map((_, i) => (
        <div key={i} className={`${baseClass} h-4 ${i === lines - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  );
};

// Page transition wrapper
export const PageTransition = ({ children, className = '' }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={children.key || 'default'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);