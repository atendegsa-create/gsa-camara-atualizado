import { useEffect } from 'react';
import { useAuth } from '../AuthContext';

export function useTenantTheme() {
  const { tenant } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    
    // Cores padrão da REDE GSA MASTER (Fallback)
    const defaultPrimary = '#5A5A40'; 
    const defaultSecondary = '#1e3a8a'; 
    
    if (tenant?.white_label) {
      // Injeta as cores da unidade credenciada, se existirem
      root.style.setProperty('--brand-primary', tenant.white_label.primaryColor || defaultPrimary);
      root.style.setProperty('--brand-secondary', tenant.white_label.secondaryColor || defaultSecondary);
    } else {
      // Reseta para as cores originais da GSA Master caso seja um admin global ou não haja tenant
      root.style.setProperty('--brand-primary', defaultPrimary);
      root.style.setProperty('--brand-secondary', defaultSecondary);
    }
  }, [tenant]);
}
