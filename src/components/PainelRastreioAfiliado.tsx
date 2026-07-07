import React from 'react';
import { Link, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Este painel apenas consome os leads onde afiliado_id == currentUser.uid
export const PainelRastreioAfiliado: React.FC = () => {
  // Mock de dados. No mundo real, busque do Firestore
  const leads = [
    { id: '1', nome: 'João Pedro', servico: 'Revisão de Juros', status: 'NOVO', data: '10/05/2026' },
    { id: '2', nome: 'Maria Silva', servico: 'Limpa Nome', status: 'EM_ANALISE', data: '09/05/2026' },
    { id: '3', nome: 'Empresa XYZ', servico: 'Assessoria de Cobrança', status: 'CONVERTIDO', data: '05/05/2026' },
  ];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'NOVO': return <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-bold"><Clock className="w-3 h-3 mr-1"/> Recebido</span>;
      case 'EM_ANALISE': return <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-bold"><AlertCircle className="w-3 h-3 mr-1"/> Em Atendimento</span>;
      case 'CONVERTIDO': return <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1"/> Aprovado!</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800">Meus Indicados</h2>
        <p className="text-slate-500">Acompanhe o status das suas indicações em tempo real.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4">Lead Indicado</th>
              <th className="p-4">Serviço de Interesse</th>
              <th className="p-4">Data da Indicação</th>
              <th className="p-4">Status do Processo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-700">{lead.nome}</td>
                <td className="p-4 text-slate-600 font-medium">{lead.servico}</td>
                <td className="p-4 text-slate-500 text-sm">{lead.data}</td>
                <td className="p-4">{getStatusBadge(lead.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
