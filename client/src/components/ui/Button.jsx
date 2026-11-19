// src/components/ui/Button.jsx

import React from 'react';

export const Button = ({ children, onClick, className = '' }) => (
  <button 
    onClick={onClick} 
    className={`px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 ${className}`}
  >
    {children}
  </button>
);