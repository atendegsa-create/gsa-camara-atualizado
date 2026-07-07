import { useEffect } from 'react';

export const useUTMTracking = () => {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        utms[param] = value;
      }
    });

    if (Object.keys(utms).length > 0) {
      // Salva no sessionStorage para persistir durante a sessão
      const existingUtms = JSON.parse(sessionStorage.getItem('gsa_utms') || '{}');
      const updatedUtms = { ...existingUtms, ...utms, last_updated: new Date().toISOString() };
      sessionStorage.setItem('gsa_utms', JSON.stringify(updatedUtms));
      
      // Também guarda no localStorage para atribuição de longo prazo (opcional)
      localStorage.setItem('gsa_utms_last', JSON.stringify(updatedUtms));
      
      console.log('UTMs capturadas:', updatedUtms);
    }
  }, []);

  const getUTMs = (): Record<string, string> => {
    return JSON.parse(sessionStorage.getItem('gsa_utms') || '{}');
  };

  const trackPixelEvent = (eventName: string, data?: any) => {
    // @ts-ignore - Injetado via TrackingScripts
    if (window.fbq) {
      // @ts-ignore
      window.fbq('track', eventName, {
        ...data,
        ...getUTMs()
      });
    }
    console.log(`Pixel Event: ${eventName}`, data);
  };

  return { getUTMs, trackPixelEvent };
};
