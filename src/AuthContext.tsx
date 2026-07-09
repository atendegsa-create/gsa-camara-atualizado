import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, UserRole, Tenant } from './types';
import { useLocation } from 'react-router-dom';
import { useTenantResolver } from './hooks/useTenantResolver';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tenant: Tenant | null; // Novo: Dados da unidade credenciada (White-Label)
  loading: boolean;
  
  // Helpers de RBAC
  isAdmin: boolean; // Mantido para retrocompatibilidade
  isMaster: boolean; // GSA Master (Acesso total)
  isDiretor: boolean; // Diretor Regional
  isAdminUnidade: boolean; // Dono/Gestor da Unidade Credenciada
  isAdminGeral: boolean;
  isMasterAdmin: boolean;
  isGestorUnidade: boolean;
  isProcurador: boolean;
  isMediador: boolean;
  
  impersonatedUser: UserProfile | null;
  startImpersonation: (user: UserProfile) => void;
  stopImpersonation: () => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  tenant: null,
  loading: true,
  isAdmin: false,
  isMaster: false,
  isDiretor: false,
  isAdminUnidade: false,
  isAdminGeral: false,
  isMasterAdmin: false,
  isGestorUnidade: false,
  isProcurador: false,
  isMediador: false,
  impersonatedUser: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const { resolvedTenant, loadingTenant } = useTenantResolver();

  // Atualiza o tenant global quando o resolver encontra algo ou quando o perfil muda
  useEffect(() => {
    if (resolvedTenant) {
      setTenant(resolvedTenant);
    }
  }, [resolvedTenant]);

  // Busca os dados da Unidade (Tenant) vinculada ao usuário
  const fetchTenant = async (tenantId: string) => {
    try {
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (tenantDoc.exists()) {
        setTenant({ ...tenantDoc.data(), id: tenantDoc.id } as Tenant);
      } else {
        setTenant(null);
      }
    } catch (error) {
      console.error("Erro ao buscar dados da unidade (Tenant):", error);
      setTenant(null);
    }
  };

  const fetchProfile = async (firebaseUser: User, targetUid?: string) => {
    try {
      const uidToFetch = targetUid || firebaseUser.uid;
      let userDoc = await getDoc(doc(db, 'usuarios', uidToFetch));
      let data: UserProfile | null = null;

      if (userDoc.exists()) {
        data = userDoc.data() as UserProfile;
      } else if (!targetUid) {
        // Fallback: buscar por email se o doc do UID não existir
        if (firebaseUser.email) {
          const q = query(collection(db, 'usuarios'), where('email', '==', firebaseUser.email.toLowerCase()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            data = { ...existingDoc.data() as UserProfile, id: firebaseUser.uid };
            try {
              await setDoc(doc(db, 'usuarios', firebaseUser.uid), data);
              if (existingDoc.id !== firebaseUser.uid) {
                await deleteDoc(doc(db, 'usuarios', existingDoc.id));
              }
            } catch (writeErr) {
              console.warn("⚠️ Não foi possível salvar doc de fallback por email (offline):", writeErr);
            }
          }
        }
      }

       if (data) {
         // Garante que atende.gsa@gmail.com nunca perca admin (bootstrap/recuperação)
         if (firebaseUser.email?.toLowerCase() === 'atende.gsa@gmail.com' && data.tipo_usuario !== 'MASTER') {
           data.tipo_usuario = 'MASTER';
           data.status = 'APROVADO';
           try {
             await updateDoc(doc(db, 'usuarios', firebaseUser.uid), {
               tipo_usuario: 'MASTER',
               status: 'APROVADO'
             });
           } catch (writeErr) {
             console.warn("⚠️ Não foi possível atualizar perfil MASTER (offline):", writeErr);
           }
         }

         // Garante que o usuário possua um código de afiliado mais curto e amigável
         if (!data.codigo_afiliado) {
           const primeiroNome = (data.nome_completo || firebaseUser.displayName || 'GSA')
             .trim()
             .split(' ')[0]
             .toUpperCase()
             .normalize('NFD')
             .replace(/[\u0300-\u036f]/g, '')
             .replace(/[^A-Z0-9]/g, '');
           const prefixo = primeiroNome.substring(0, 5) || 'GSA';
           const numerosUid = firebaseUser.uid.replace(/\D/g, '');
           let sufixo = numerosUid.substring(0, 3);
           if (sufixo.length < 3) {
             let soma = 0;
             for (let i = 0; i < firebaseUser.uid.length; i++) {
               soma += firebaseUser.uid.charCodeAt(i);
             }
             sufixo = String(soma).substring(0, 3).padStart(3, '7');
           }
           const codigoGerado = `${prefixo}${sufixo}`;
           data.codigo_afiliado = codigoGerado;
           try {
             await updateDoc(doc(db, 'usuarios', firebaseUser.uid), {
               codigo_afiliado: codigoGerado
             });
           } catch (writeErr) {
             console.warn("⚠️ Não foi possível atualizar código de afiliado (offline):", writeErr);
           }
         }

         if (!targetUid) {
           setProfile(data);
           setOriginalProfile(data);
           localStorage.setItem(`gsa_user_profile_${firebaseUser.uid}`, JSON.stringify(data));
         }

         // Se o usuário tem uma unidade vinculada, busca os dados de White-Label
         // mas priorizamos o tenant detectado pela URL se ele já existir
         if (data.tenantId && !tenant) {
           await fetchTenant(data.tenantId);
         }

         return data;

       } else if (!targetUid) {
         // Criação de perfil inicial para novo usuário
         const searchParams = new URLSearchParams(location.search);
         const refId = searchParams.get('ref') || localStorage.getItem('gsa_ref') || sessionStorage.getItem('gsa_ref');
         
         let role: UserRole = 'CLIENTE';
         let status = 'PENDENTE';
         
         // Auto-bootstrap MASTER para email oficial
         if (firebaseUser.email?.toLowerCase() === 'atende.gsa@gmail.com') {
           role = 'MASTER';
           status = 'APROVADO';
         }

         const primeiroNome = (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário')
           .trim()
           .split(' ')[0]
           .toUpperCase()
           .normalize('NFD')
           .replace(/[\u0300-\u036f]/g, '')
           .replace(/[^A-Z0-9]/g, '');
         const prefixo = primeiroNome.substring(0, 5) || 'GSA';
         const numerosUid = firebaseUser.uid.replace(/\D/g, '');
         let sufixo = numerosUid.substring(0, 3);
         if (sufixo.length < 3) {
           let soma = 0;
           for (let i = 0; i < firebaseUser.uid.length; i++) {
             soma += firebaseUser.uid.charCodeAt(i);
           }
           sufixo = String(soma).substring(0, 3).padStart(3, '7');
         }
         const codigoGerado = `${prefixo}${sufixo}`;

         const newProfile: UserProfile = {
           id: firebaseUser.uid,
           nome_completo: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
           email: firebaseUser.email?.toLowerCase() || '',
           tipo_usuario: role,
           status: status as any,
           tenantId: tenant?.id || null,
           consultor_id: refId || null,
           codigo_afiliado: codigoGerado,
           createdAt: serverTimestamp(),
         };
         try {
           await setDoc(doc(db, 'usuarios', firebaseUser.uid), newProfile);
         } catch (writeErr) {
           console.warn("⚠️ Não foi possível criar novo perfil de usuário no banco (offline):", writeErr);
         }
         setProfile(newProfile);
         setOriginalProfile(newProfile);
         localStorage.setItem(`gsa_user_profile_${firebaseUser.uid}`, JSON.stringify(newProfile));
       }
    } catch (error: any) {
      console.warn("⚠️ Firestore fetchProfile error (offline fallback initiated):", error);
      
      // Carregar do localStorage se disponível
      const cached = localStorage.getItem(`gsa_user_profile_${firebaseUser.uid}`);
      if (cached) {
        try {
          const data = JSON.parse(cached) as UserProfile;
          if (!targetUid) {
            setProfile(data);
            setOriginalProfile(data);
          }
          return data;
        } catch (e) {
          console.error("Erro ao fazer parse do profile do localStorage:", e);
        }
      }

      // Se não houver nada em cache e targetUid for igual ao do usuário atual, gera um perfil local/offline padrão para não travar o app
      if (!targetUid) {
        let role: UserRole = 'CLIENTE';
        let status = 'PENDENTE';
        if (firebaseUser.email?.toLowerCase() === 'atende.gsa@gmail.com') {
          role = 'MASTER';
          status = 'APROVADO';
        }

        const localProfile: UserProfile = {
          id: firebaseUser.uid,
          nome_completo: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário Offline',
          email: firebaseUser.email?.toLowerCase() || '',
          tipo_usuario: role,
          status: status as any,
          tenantId: tenant?.id || null,
          consultor_id: null,
          codigo_afiliado: 'OFFLINE' + firebaseUser.uid.substring(0, 4).toUpperCase(),
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any, // Mock Timestamp para offline
          isOfflineProfile: true
        };

        setProfile(localProfile);
        setOriginalProfile(localProfile);
        return localProfile;
      }

      // Se for para outro UID e der erro, apenas logamos
      console.error("Não foi possível carregar o perfil do usuário de destino (offline):", error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          await fetchProfile(firebaseUser);
        } else {
          setProfile(null);
          setOriginalProfile(null);
          setImpersonatedUser(null);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [tenant?.id]); // Recarrega se o tenant detectado mudar para garantir context sync

  const refreshProfile = async () => {
    if (user) {
      if (impersonatedUser) {
        await fetchProfile(user, impersonatedUser.id);
      } else {
        await fetchProfile(user);
      }
    }
  };

  // Lógica de papéis (RBAC)
  const currentProfile = impersonatedUser || profile;
  
  const isMaster = currentProfile?.tipo_usuario === 'MASTER' || currentProfile?.tipo_usuario === 'ADMIN' || currentProfile?.tipo_usuario === 'AdminGeral' || currentProfile?.tipo_usuario === 'MasterAdmin';
  const isDiretor = currentProfile?.tipo_usuario === 'DIRETOR' || currentProfile?.tipo_usuario === 'UNIDADE' || currentProfile?.tipo_usuario === 'GestorUnidade';
  const isAdminUnidade = currentProfile?.tipo_usuario === 'UNIDADE' || currentProfile?.tipo_usuario === 'AdminGeral' || currentProfile?.tipo_usuario === 'GestorUnidade';
  const isAdminGeral = currentProfile?.tipo_usuario === 'AdminGeral';
  const isMasterAdmin = currentProfile?.tipo_usuario === 'MasterAdmin' || currentProfile?.tipo_usuario === 'MASTER';
  const isGestorUnidade = currentProfile?.tipo_usuario === 'GestorUnidade' || currentProfile?.tipo_usuario === 'UNIDADE';
  const isProcurador = currentProfile?.tipo_usuario === 'Procurador';
  const isMediador = currentProfile?.tipo_usuario === 'Mediador';
  
  // isAdmin genérico (mantido para não quebrar componentes antigos que usavam isAdmin)
  const isAdmin = isMaster || isAdminUnidade;

  const isRealMaster = originalProfile?.tipo_usuario === 'MASTER' || originalProfile?.tipo_usuario === 'ADMIN' || originalProfile?.tipo_usuario === 'AdminGeral';

  const startImpersonation = async (targetUser: UserProfile) => {
    if (!isRealMaster) return;
    setImpersonatedUser(targetUser);
    // Ao personificar, também carregamos o tenant do usuário personificado para ver o White-Label dele
    if (targetUser.tenantId) {
      await fetchTenant(targetUser.tenantId);
    } else {
      setTenant(null);
    }
  };

  const stopImpersonation = async () => {
    setImpersonatedUser(null);
    // Restaura o tenant do admin original
    if (originalProfile?.tenantId) {
      await fetchTenant(originalProfile.tenantId);
    } else {
      setTenant(null);
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: currentProfile, 
      tenant, // Disponibiliza o config da unidade globalmente
      loading, 
      
      isAdmin,
      isMaster,
      isDiretor,
      isAdminUnidade,
      isAdminGeral,
      isMasterAdmin,
      isGestorUnidade,
      isProcurador,
      isMediador,

      impersonatedUser,
      startImpersonation,
      stopImpersonation,
      refreshProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
