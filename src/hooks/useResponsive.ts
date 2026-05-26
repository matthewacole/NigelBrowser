import { useState, useEffect } from 'react';

export interface ResponsiveInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => ({
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    isTouchDevice: window.matchMedia('(pointer: coarse)').matches,
  }));

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 767px)');
    const mqTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const mqDesktop = window.matchMedia('(min-width: 1024px)');
    const mqTouch = window.matchMedia('(pointer: coarse)');

    const update = () => {
      setInfo({
        isMobile: mqMobile.matches,
        isTablet: mqTablet.matches,
        isDesktop: mqDesktop.matches,
        isTouchDevice: mqTouch.matches,
      });
    };

    mqMobile.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
    mqDesktop.addEventListener('change', update);
    mqTouch.addEventListener('change', update);

    return () => {
      mqMobile.removeEventListener('change', update);
      mqTablet.removeEventListener('change', update);
      mqDesktop.removeEventListener('change', update);
      mqTouch.removeEventListener('change', update);
    };
  }, []);

  return info;
}
