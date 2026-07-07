import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  fallbackPath = '/dashboard' // Rota padrão para onde o usuário será expulso se não tiver permissão
}) => {
  const { profile, loading, user, tenant } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5A5A40] border-t-transparent"></div>
      </div>
    );
  }

  // Se não estiver logado, manda pro login salvando a rota que ele tentou acessar
  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (tenant?.status === 'PENDENTE_PAGAMENTO') {
    // We don't block master or clients, but we block internal staff of that tenant
    if (!profile.tipo_usuario.includes('MASTER') && profile.tipo_usuario !== 'Cliente' && profile.tipo_usuario !== 'CLIENTE') {
      return <Navigate to="/adesao" replace />;
    }
  }

  // Verifica se a role do usuário está na lista de roles permitidas para esta rota
  const hasPermission = allowedRoles.includes(profile.tipo_usuario);

  if (!hasPermission) {
    console.warn(`RoleProtectedRoute: access denied to ${location.pathname} for user ${profile.email} role ${profile.tipo_usuario} allowedRoles ${allowedRoles.join(',')}`);
    // Redirecionamento inteligente baseado no perfil
    const slugPrefix = tenant?.slug ? `/${tenant.slug}` : '';
    if (profile.tipo_usuario === 'Cliente' || profile.tipo_usuario === 'CLIENTE') return <Navigate to={`${slugPrefix}/painel`} replace />;
    if (profile.tipo_usuario === 'CONSULTOR' || profile.tipo_usuario === 'AFILIADO' || (profile.tipo_usuario as unknown) === 'consultor') return <Navigate to={`${slugPrefix}/consultor`} replace />;
    if (profile.tipo_usuario === 'Mediador') return <Navigate to={`${slugPrefix}/painel`} replace />;
    
    return <Navigate to={fallbackPath} replace />;
  }

  // Se tem permissão, renderiza o componente filho (a página solicitada)
  return <>{children}</>;
};
