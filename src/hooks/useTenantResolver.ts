import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tenant } from '../types';

export function useTenantResolver() {
  const location = useLocation();
  const [resolvedTenant, setResolvedTenant] = useState<Tenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const resolveTenant = async () => {
      const hostname = window.location.hostname;
      const pathParts = location.pathname.split('/').filter(Boolean);
      const slug = pathParts[0];

      // Lista de domínios ignorados (sistema)
      const systemDomains = ['localhost', 'ais-dev', 'ais-pre', 'webcontainer', 'stackblitz', 'firebaseapp.com', 'web.app'];
      const isSystemDomain = systemDomains.some(d => hostname.includes(d));

      const systemPaths = [
        'painel', 'crm', 'login', 'portal', 'admin-preview', 'landing', 
        'site-comercial', 'analise-online', 'notificacao-digital', 
        'quiz-rx-inss', 'rx-inss-sucesso', 'limpa-nome', 'acesso-cliente', 
        'ar-online', 'acompanhar', 'quiz-limpa-nome'
      ];

      try {
        let tenantId: string | null = null;

        // 1. Tenta por Domínio
        if (!isSystemDomain) {
          const q = query(collection(db, 'tenants'), where('dominio_personalizado', '==', hostname));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            tenantId = snapshot.docs[0].id;
          }
        }

        // 2. Tenta por Slug se não resolveu por domínio
        if (!tenantId && slug && slug.length > 2 && !systemPaths.includes(slug)) {
          const q = query(collection(db, 'tenants'), where('slug', '==', slug));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            tenantId = snapshot.docs[0].id;
          }
        }

        if (tenantId) {
          // Escuta em tempo real para atualizações de White-Label
          unsubscribe = onSnapshot(doc(db, 'tenants', tenantId), (docSnap) => {
            if (docSnap.exists()) {
              const tenantData = { id: docSnap.id, ...docSnap.data() } as Tenant;
              setResolvedTenant(tenantData);
              if (tenantData.white_label?.primaryColor) {
                document.documentElement.style.setProperty('--brand-primary', tenantData.white_label.primaryColor);
              }
            }
          });
        } else {
          setResolvedTenant(null);
        }
      } catch (error) {
        console.error("Erro ao resolver unidade:", error);
        setResolvedTenant(null);
      } finally {
        setLoadingTenant(false);
      }
    };

    resolveTenant();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [location.pathname]);

  return { resolvedTenant, loadingTenant };
}
