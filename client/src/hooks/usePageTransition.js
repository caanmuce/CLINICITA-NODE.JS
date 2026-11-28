// src/hooks/usePageTransition.js
// Hook personalizado para transiciones de página suaves

import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export const usePageTransition = (duration = 300) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const timerRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip initial render to avoid synchronous setState
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsTransitioning(true);
    setTransitionKey((k) => k + 1);

    timerRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname, duration]);

  return { isTransitioning, transitionKey };
};

// Hook para animaciones de entrada/salida de componentes
export const useMountTransition = (isMounted, { duration = 200 } = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isMounted) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setHasMounted(true);
        setIsVisible(true);
      }, 0);
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setIsVisible(false), 0);
      timerRef.current = setTimeout(() => {
        setHasMounted(false);
      }, duration);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [isMounted, duration]);

  return { isVisible, hasMounted };
};
