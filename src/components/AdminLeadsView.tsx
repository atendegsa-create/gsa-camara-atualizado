import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Users, Filter, Search, TrendingUp, DollarSign, Activity, FileText, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { buildTenantQuery } from '../lib/db';
import { LeadKanbanBoard } from './LeadKanbanBoard';
import { cn } from '../lib/utils';

interface Lead {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  cliente_documento: string;
  status: string;
  data_abertura: string;
  servico_alvo?: string;
}

export function AdminLeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterServico, setFilterServico] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const { profile } = useAuth();

  useEffect(() => {
    if (!db || !profile) return;
    
    let q;
    try {
      q = buildTenantQuery('processos', profile, [orderBy('data_abertura', 'desc')]);
    } catch (e) {
      console.error(e);
      setLoading(false);
      return;
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: Lead[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leadsData.push({
          id: doc.id,
          cliente_nome: data.cliente_nome || 'N/A',
          cliente_email: data.cliente_email || '-',
          cliente_whatsapp: data.cliente_whatsapp || '-',
          cliente_documento: data.cliente_documento || '-',
          status: data.status,
          data_abertura: data.data_abertura,
          servico_alvo: data.servico_alvo || 'MEDIACAO',
        });
      });
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'processos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
           lead.cliente_documento.includes(searchTerm) ||
           lead.cliente_whatsapp.includes(searchTerm);
    if (filterServico !== 'TODOS' && lead.servico_alvo !== filterServico) return false;
    return matchesSearch;
  });

  const countByStatus = (status: string) => filteredLeads.filter(l => l.status === status).length;
  
  const metrics = [
    { label: "Total Leads", value: filteredLeads.length, color: "bg-blue-50 text-blue-700 hover:bg-blue-100", icon: <Users size={20} /> },
    { label: "Fase Gratuita", value: countByStatus("LEAD"), color: "bg-gray-50 text-gray-700 hover:bg-gray-100", icon: <Filter size={20} /> },
    { label: "Simulacao (R$17)", value: countByStatus("SIMULACAO_PAGA"), color: "bg-green-50 text-green-700 hover:bg-green-100", icon: <Activity size={20} /> },
    { label: "Laudo (R$47)", value: countByStatus("LAUDO_PAGO"), color: "bg-purple-50 text-purple-700 hover:bg-purple-100", icon: <FileText size={20} /> },
    { label: "Mediação (R$297)", value: countByStatus("MEDIACAO_CONTRATADA"), color: "bg-orange-50 text-orange-700 hover:bg-orange-100", icon: <DollarSign size={20} /> }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-500" /> Dashboard de Leads
          </h1>
          <p className="text-gray-500 font-medium mt-1">Acompanhe funil de conversão e detalhes de interessados.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
           <button 
             onClick={() => setViewMode('kanban')}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
               viewMode === 'kanban' ? "bg-[#1e293b] text-white shadow-md" : "text-gray-400 hover:bg-gray-50"
             )}
           >
             <LayoutGrid size={14} /> Kanban
           </button>
           <button 
             onClick={() => setViewMode('table')}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
               viewMode === 'table' ? "bg-[#1e293b] text-white shadow-md" : "text-gray-400 hover:bg-gray-50"
             )}
           >
             <List size={14} /> Tabela
           </button>
        </div>
      </div>

      {/* Abas de Filtro de Funil (Serviço Alvo) */}
      <div className="flex gap-4 border-b border-gray-200">
        {[
          { id: 'TODOS', label: 'Todos os Funis' },
          { id: 'MEDIACAO', label: 'App Mediação' },
          { id: 'LIMPA_NOME', label: 'Limpa Nome' },
          { id: 'RX_INSS', label: 'RX INSS' }
        ].map((tab) => (
           <button 
             key={tab.id} 
             onClick={() => setFilterServico(tab.id)}
             className={cn(
               "pb-3 px-2 font-bold text-sm tracking-wide border-b-2 transition-colors",
               filterServico === tab.id ? "border-[#1e293b] text-[#1e293b]" : "border-transparent text-gray-400 hover:text-gray-700"
             )}
           >
             {tab.label}
           </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {metrics.map((m, idx) => (
             <div key={idx} className={`p-4 rounded-2xl border border-gray-100 shadow-sm transition-all cursor-default ${m.color}`}>
                 <div className="flex items-center gap-2 mb-2">
                     <div className="p-2 bg-white/60 rounded-lg">{m.icon}</div>
                 </div>
                 <p className="text-3xl font-black mb-1">{m.value}</p>
                 <p className="text-xs font-bold uppercase tracking-wider opacity-80">{m.label}</p>
             </div>
          ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col p-4">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 mb-6 rounded-2xl">
             <div className="relative w-full max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    type="text"
                    placeholder="Buscar lead por nome, CPF ou WhatsApp..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e293b] outline-none text-sm"
                 />
             </div>
          </div>
          
          {viewMode === 'kanban' ? (
            <LeadKanbanBoard initialLeads={filteredLeads} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                          <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Nome & Contato</th>
                          <th className="p-4 font-bold uppercase tracking-wider text-[10px]">CPF / CNPJ</th>
                          <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Fase Atual</th>
                          <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Data Criação</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {loading ? (
                          <tr><td colSpan={4} className="p-8 text-center text-gray-400">Carregando leads...</td></tr>
                      ) : filteredLeads.length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhum lead encontrado.</td></tr>
                      ) : (
                          filteredLeads.map((lead) => (
                              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="p-4">
                                      <div className="font-bold text-[#1e293b]">{lead.cliente_nome}</div>
                                      <div className="text-xs text-gray-500">{lead.cliente_whatsapp}</div>
                                      <div className="text-xs text-gray-500">{lead.cliente_email}</div>
                                  </td>
                                  <td className="p-4 font-medium text-gray-600">{lead.cliente_documento || '---'}</td>
                                  <td className="p-4">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                          lead.status === 'LEAD' ? 'bg-gray-100 text-gray-600' :
                                          lead.status === 'SIMULACAO_PAGA' ? 'bg-green-100 text-green-700' :
                                          lead.status === 'LAUDO_PAGO' ? 'bg-purple-100 text-purple-700' :
                                          lead.status === 'MEDIACAO_CONTRATADA' ? 'bg-orange-100 text-orange-700' :
                                          'bg-blue-100 text-blue-700'
                                      }`}>
                                          {lead.status.replace('_', ' ')}
                                      </span>
                                  </td>
                                  <td className="p-4 text-xs text-gray-500 font-medium">
                                      {new Date(lead.data_abertura).toLocaleString('pt-BR')}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
