import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useUTMTracking = () => {
  let location: any = null;
  try {
    location = useLocation();
  } catch (e) {
    // Fallback se não estiver dentro de um contexto Router
  }

  const captureTracking = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const utms: Record<string, string> = {};
      
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
        const value = searchParams.get(param);
        if (value) {
          utms[param] = value;
        }
      });

      const ref = searchParams.get('ref');
      const parceiro = searchParams.get('parceiro');

      if (ref) {
        sessionStorage.setItem('gsa_ref', ref);
        localStorage.setItem('gsa_ref', ref);
      }
      if (parceiro) {
        sessionStorage.setItem('gsa_parceiro', parceiro);
        localStorage.setItem('gsa_parceiro', parceiro);
        // Fallback para ref se gsa_ref estiver vazio
        if (!ref) {
          sessionStorage.setItem('gsa_ref', parceiro);
          localStorage.setItem('gsa_ref', parceiro);
        }
      }

      if (Object.keys(utms).length > 0) {
        // Salva no sessionStorage para persistir durante a sessão
        const existingUtms = JSON.parse(sessionStorage.getItem('gsa_utms') || '{}');
        const updatedUtms = { ...existingUtms, ...utms, last_updated: new Date().toISOString() };
        sessionStorage.setItem('gsa_utms', JSON.stringify(updatedUtms));
        
        // Também guarda no localStorage para atribuição de longo prazo
        localStorage.setItem('gsa_utms_last', JSON.stringify(updatedUtms));
        
        console.log('UTMs capturadas globalmente:', updatedUtms);
      }
    } catch (err) {
      console.warn('Erro ao processar UTMs e parâmetros de afiliado:', err);
    }
  };

  useEffect(() => {
    captureTracking();
  }, [location?.search, location?.pathname]);

  const getUTMs = (): Record<string, string> => {
    try {
      const utms = JSON.parse(sessionStorage.getItem('gsa_utms') || '{}');
      const ref = sessionStorage.getItem('gsa_ref') || localStorage.getItem('gsa_ref');
      const parceiro = sessionStorage.getItem('gsa_parceiro') || localStorage.getItem('gsa_parceiro');
      if (ref) utms.ref = ref;
      if (parceiro) utms.parceiro = parceiro;
      return utms;
    } catch (e) {
      return {};
    }
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

  return { getUTMs, trackPixelEvent, captureTracking };
};

