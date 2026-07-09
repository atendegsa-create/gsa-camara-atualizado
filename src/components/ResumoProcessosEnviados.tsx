import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Calendar, Clock, ChevronRight, Zap, RefreshCw, Eye } from 'lucide-react';
import { motion } from 'motion/react';

interface ProcessSummary {
  id: string;
  cliente_nome?: string;
  tipo_acao?: string;
  data_abertura?: any;
  status?: string;
  tenantId?: string;
  criado_por?: string;
}

export function ResumoProcessosEnviados() {
  const { user, profile } = useAuth();
  const [processos, setProcessos] = useState<ProcessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Detect slug prefix for nested navigation
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0];
  const systemPaths = ['painel', 'crm', 'login', 'portal', 'admin-preview', 'config', 'usuarios', 'unidades', 'parceiros'];
  const slugPrefix = firstPart && !systemPaths.includes(firstPart) && firstPart.length > 2 ? `/${firstPart}` : '';
  const isCrm = profile?.tipo_usuario === 'CONSULTOR' || profile?.tipo_usuario === 'AFILIADO' || (profile?.tipo_usuario as any) === 'consultor';
  const basePath = isCrm ? `${slugPrefix}/consultor` : `${slugPrefix}/painel`;

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const userRole = profile.tipo_usuario || '';
    const isMasterUser = ['MASTER', 'MasterAdmin', 'AdminGeral', 'ADMIN'].includes(userRole);
    const myTenantId = profile.tenantId || profile.unidadeId || '';

    let q;
    const processosRef = collection(db, 'processos');

    if (isMasterUser) {
      // Masters see all
      q = query(processosRef);
    } else if (userRole === 'UNIDADE' || userRole === 'DIRETOR' || userRole === 'GestorUnidade') {
      // Unidades/Diretores see all processes belonging to their tenant
      if (myTenantId) {
        q = query(processosRef, where('tenantId', '==', myTenantId));
      } else {
        q = query(processosRef);
      }
    } else {
      // Sellers / Vendedores see processes created by them, or under their tenant
      if (myTenantId) {
        q = query(processosRef, where('tenantId', '==', myTenantId));
      } else {
        q = query(processosRef, where('criado_por', '==', user.uid));
      }
    }

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: ProcessSummary[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            cliente_nome: data.cliente_nome || data.cliente || '',
            tipo_acao: data.tipo_acao || data.tipo || '',
            data_abertura: data.data_abertura || data.dataCriacao,
            status: data.status,
            tenantId: data.tenantId,
            criado_por: data.criado_por || data.referrerId || '',
          });
        });

        // Sort client-side by date to avoid requiring composite indexes
        list.sort((a, b) => {
          const tA = a.data_abertura ? (typeof a.data_abertura === 'string' ? new Date(a.data_abertura).getTime() : a.data_abertura.seconds ? a.data_abertura.seconds * 1000 : a.data_abertura.toDate ? a.data_abertura.toDate().getTime() : 0) : 0;
          const tB = b.data_abertura ? (typeof b.data_abertura === 'string' ? new Date(b.data_abertura).getTime() : b.data_abertura.seconds ? b.data_abertura.seconds * 1000 : b.data_abertura.toDate ? b.data_abertura.toDate().getTime() : 0) : 0;
          return tB - tA;
        });

        // Additional client-side safety filtering for sellers to only see their own processes if not broad-unit
        if (userRole === 'VENDEDOR') {
          // If the tenant matches but we want to display only their own referred or created ones, or all tenant ones depending on permission
          // Let's filter to processes where created_por === user.uid or similar, or keep all if tenant broad
          // We will prioritize showing processes they created first or matches tenant
          const filtered = list.filter(p => p.criado_por === user.uid || !p.criado_por || p.tenantId === myTenantId);
          setProcessos(filtered);
        } else {
          setProcessos(list);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Erro ao carregar resumo de processos de envio:", err);
        setError("Não foi possível carregar o histórico de processos enviados em tempo real. Exibindo simulação.");
        
        // Setup visual simulation fallbacks
        const simulatedList: ProcessSummary[] = [
          {
            id: 'sim-1',
            cliente_nome: 'Marcos de Souza Pereira',
            tipo_acao: 'Limpa Nome Judicial',
            data_abertura: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Análise Jurídica'
          },
          {
            id: 'sim-2',
            cliente_nome: 'Empresa Alimentos Estrela Ltda',
            tipo_acao: 'Revisional de Consignado',
            data_abertura: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Pronto para Distribuição'
          }
        ];
        setProcessos(simulatedList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, profile]);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  const getStatusBadgeStyles = (status?: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('pronto') || s.includes('homologado') || s.includes('pago')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (s.includes('análise') || s.includes('triagem') || s.includes('processando')) {
      return 'bg-blue-50 text-blue-700 border-blue-100';
    }
    if (s.includes('pendente') || s.includes('atraso')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (s.includes('recusado') || s.includes('cancelado')) {
      return 'bg-rose-50 text-rose-700 border-rose-100';
    }
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  const handleVerDetalhes = (id: string) => {
    if (id.startsWith('sim-')) {
      navigate(`${basePath}/processos`);
    } else {
      navigate(`${basePath}/processos/${id}`);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden" id="resumo-processos-enviados-card">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-black text-lg text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-600" /> Resumo de Processos Enviados
          </h3>
          <p className="text-xs text-slate-500 mt-1">Acompanhe os envios mais recentes e sua situação atualizada</p>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600" />
            Sincronizando...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-amber-50/50 border-b border-amber-100 p-3 px-6 text-[11px] text-amber-700 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          {error}
        </div>
      )}

      {loading && processos.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Carregando lista de processos...</p>
        </div>
      ) : processos.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">Nenhum processo enviado</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Novos atos cadastrados na plataforma ou captados via funil inteligente aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-gray-100">
                <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Processo Enviado</th>
                <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Data de Envio</th>
                <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Situação Atual</th>
                <th className="py-3 px-6 text-right text-[10px] font-black uppercase text-slate-500 tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processos.slice(0, 5).map((proc) => (
                <tr key={proc.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{proc.cliente_nome || 'Cliente não identificado'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{proc.tipo_acao || 'Ação não informada'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(proc.data_abertura)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(proc.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {proc.status || 'Triagem'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleVerDetalhes(proc.id)}
                      id={`btn-ver-detalhes-${proc.id}`}
                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white hover:text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-all border border-slate-950 active:scale-95 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {processos.length > 5 && (
            <div className="p-4 bg-slate-50/30 border-t border-gray-100 text-center">
              <button
                onClick={() => navigate(`${basePath}/processos`)}
                className="text-xs text-violet-600 hover:text-violet-700 font-bold inline-flex items-center gap-1 hover:gap-1.5 transition-all"
              >
                Visualizar todos os {processos.length} processos <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
