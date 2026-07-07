import React, { useState, useEffect } from 'react';
import { Activity, Network, ShieldAlert, ArrowRightCircle, Search, X, MessageSquare, Phone, Mail, FileText, CheckCircle, Star } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';

export const AnalistaControlTower: React.FC = () => {
  const [leadsGlobais, setLeadsGlobais] = useState<any[]>([]);
  const [qtdSlaEstourado, setQtdSlaEstourado] = useState(0);
  const [leadSelecionado, setLeadSelecionado] = useState<any>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = () => {
      const q = query(collection(db, 'leads_vitrine'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const leadsData: any[] = [];
        const now = new Date().getTime();
        let slaCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          let isSlaEstourado = false;
          let horasDesdeCaptura = 0;

          if (data.data_captura) {
            let capturaTime: number;
            if (data.data_captura.toDate) {
                capturaTime = data.data_captura.toDate().getTime();
            } else if (data.data_captura._seconds) {
                capturaTime = data.data_captura._seconds * 1000;
            } else {
                capturaTime = new Date(data.data_captura).getTime();
            }
            
            horasDesdeCaptura = (now - capturaTime) / (1000 * 60 * 60);
            
            if (data.sla_horas && horasDesdeCaptura > data.sla_horas) {
              isSlaEstourado = true;
            } else if (!data.sla_horas && horasDesdeCaptura > 24) { 
               isSlaEstourado = true;
            }
          }

          if (isSlaEstourado) {
             slaCount++;
          }

          leadsData.push({ 
            id: doc.id, 
            ...data,
            isSlaEstourado,
            horasDesdeCaptura
          });
        });

        // Ordenar os leads (SLA estourado primeiro, depois mais antigos)
        leadsData.sort((a, b) => {
          if (a.isSlaEstourado && !b.isSlaEstourado) return -1;
          if (!a.isSlaEstourado && b.isSlaEstourado) return 1;
          return b.horasDesdeCaptura - a.horasDesdeCaptura;
        });

        setLeadsGlobais(leadsData);
        setQtdSlaEstourado(slaCount);
      }, (error) => {
        console.error("Erro ao buscar leads: ", error);
        setLeadsGlobais([]);
        setQtdSlaEstourado(0);
      });
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setupListener();
      } else {
        if (unsubscribe) unsubscribe();
        setLeadsGlobais([]);
        setQtdSlaEstourado(0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const assumirLead = async (leadId: string) => {
    if (!auth.currentUser) return;
    try {
      const leadRef = doc(db, 'leads_vitrine', leadId);
      await updateDoc(leadRef, {
        status: 'EM_ATENDIMENTO',
        responsavel_atribuido: auth.currentUser.displayName || auth.currentUser.email,
        data_atualizacao: new Date()
      });
      alert('Lead assumido com sucesso!');
      setLeadSelecionado(null);
    } catch (error) {
      console.error("Erro ao assumir lead: ", error);
      alert('Erro ao assumir o lead.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center">
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 mr-3 text-indigo-600 shrink-0" /> 
            Torre de Controle <span className="hidden sm:inline ml-2">(Suporte Global)</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Gestão de triagem, SLA de Unidades e roteamento de leads das Unidades Representantes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
          <p className="text-slate-500 text-sm font-bold uppercase">SLA Estourado (Resgate)</p>
          <h3 className="text-3xl font-black text-slate-800">{qtdSlaEstourado}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-slate-500 text-sm font-bold uppercase">Fila Analistas</p>
          <h3 className="text-3xl font-black text-slate-800">{leadsGlobais.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center">
            <Network className="w-5 h-5 mr-2" />
            <h3 className="font-bold">Log de Rastreamento Global</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4">Lead</th>
                <th className="p-4">Serviço</th>
                <th className="p-4">Árvore de Indicação</th>
                <th className="p-4">Status / Local</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadsGlobais.map(lead => (
                <tr key={lead.id} className={`hover:bg-slate-50 cursor-pointer ${lead.isSlaEstourado ? 'bg-red-50/30' : lead.is_priority ? 'bg-amber-50/50' : ''}`} onClick={() => setLeadSelecionado(lead)}>
                  <td className="p-4 font-bold text-slate-800 flex items-center">
                    {lead.isSlaEstourado && <ShieldAlert className="w-4 h-4 text-red-500 mr-2" />}
                    {lead.is_priority && <Star className="w-4 h-4 text-amber-500 mr-2 fill-amber-500" />}
                    {lead.nome}
                  </td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${lead.is_priority ? 'bg-amber-100 text-amber-800' : 'bg-slate-100'}`}>{lead.servico || lead.servico_solicitado}</span></td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-slate-500">Unidade: <strong className="text-slate-700">{lead.unidade || lead.tenant_responsavel || 'MASTER'}</strong></span>
                      <span className="text-slate-500">Afiliado: <strong className="text-slate-700">{lead.afiliado || lead.rastreamento_comissao?.indicado_por_nome || 'Nenhum'}</strong></span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-indigo-600 font-bold">
                    {lead.status}
                    {lead.is_priority && <div className="text-amber-600 text-[10px] uppercase mt-1">Atendimento Prioritário</div>}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setLeadSelecionado(lead); }}
                      className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center font-bold text-xs"
                    >
                      Ver Detalhes <ArrowRightCircle className="w-4 h-4 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
              {leadsGlobais.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum lead encontrado na fila de análise.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes do Lead */}
      {leadSelecionado && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="bg-slate-50 p-5 sm:p-6 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div>
                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block ${leadSelecionado.isSlaEstourado ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-600'}`}>
                  {leadSelecionado.servico || leadSelecionado.servico_solicitado || 'LEAD VITRINE'}
                  {leadSelecionado.isSlaEstourado && ' - SLA ESTOURADO'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">{leadSelecionado.nome}</h2>
                <div className="text-sm text-slate-500 mt-1 space-y-1">
                  <p>Unidade Responsável: <strong>{leadSelecionado.unidade || leadSelecionado.tenant_responsavel || 'MASTER'}</strong></p>
                  <p>Afiliado/Indicador: <strong>{leadSelecionado.afiliado || leadSelecionado.rastreamento_comissao?.indicado_por_nome || 'Nenhum'}</strong></p>
                </div>
              </div>
              <button onClick={() => setLeadSelecionado(null)} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-2 shadow-sm shrink-0 ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
              {/* Informações de Contato */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" /> Contato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Telefone / WhatsApp</p>
                    <p className="text-sm font-medium">{leadSelecionado.telefone || 'Não informado'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">E-mail</p>
                    <p className="text-sm font-medium">{leadSelecionado.email || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Botões de Contato Rápido */}
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                {leadSelecionado.telefone && (
                  <a href={`https://wa.me/${leadSelecionado.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] bg-green-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center hover:bg-green-600 transition-colors">
                    <MessageSquare className="w-4 h-4 mr-2" /> Chamar WhatsApp
                  </a>
                )}
                {leadSelecionado.email && (
                  <a href={`mailto:${leadSelecionado.email}`} className="flex-1 min-w-[140px] bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold flex items-center justify-center hover:bg-slate-300 transition-colors">
                    <Mail className="w-4 h-4 mr-2" /> Enviar E-mail
                  </a>
                )}
              </div>

              {/* Informações do Formulário */}
              {leadSelecionado.dados_adicionais && Object.keys(leadSelecionado.dados_adicionais).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-slate-400" /> Dados do Formulário
                  </h3>
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {Object.entries(leadSelecionado.dados_adicionais).map(([key, val]) => (
                        <div key={key}>
                          <p className="text-slate-500 capitalize text-xs font-bold">{key.replace(/_/g, ' ')}</p>
                          <p className="text-slate-800 font-medium">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Status de Pagamento */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-slate-400" /> Status Financeiro / Funil
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status Atual</p>
                    <p className="text-sm font-mono text-indigo-600 font-bold">{leadSelecionado.status}</p>
                  </div>
                  <div className={`p-3 rounded-xl border flex flex-col justify-center ${leadSelecionado.pagamento_confirmado ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Pagamento TAP / Análise</p>
                    {leadSelecionado.pagamento_confirmado ? (
                      <p className="text-sm font-bold text-green-700 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Confirmado</p>
                    ) : (
                      <p className="text-sm font-medium text-slate-600">Aguardando / Não Efetuado</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0 flex-wrap">
              <button onClick={() => setLeadSelecionado(null)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors flex-1 sm:flex-none">
                Fechar
              </button>
              <button 
                onClick={() => assumirLead(leadSelecionado.id)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center shadow-md transition-colors flex-1 sm:flex-none"
              >
                Assumir Lead para Atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
