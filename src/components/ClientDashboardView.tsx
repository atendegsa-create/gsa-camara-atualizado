import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Folder, Clock, CheckCircle2, AlertCircle, FileText, UploadCloud, ShieldCheck, ExternalLink, Send, MessageSquare } from 'lucide-react';

interface ProcessoCliente {
  id: string;
  nup: string;
  status: string;
  cliente_nome: string;
  parte_contraria_nome: string;
  valor_causa: number;
  resumo_fato: string;
  documentos_anexados?: Array<{ nome: string; url: string; data: string }>;
}

export default function ClientDashboardView() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<ProcessoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoCliente | null>(null);
  
  // Estados para o fluxo de negociação interna
  const [modoNegociacao, setModoNegociacao] = useState(false);
  const [valorContraproposta, setValorContraproposta] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [enviandoProposta, setEnviandoProposta] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'processos'),
      where('cliente_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProcessoCliente[];
      
      setProcessos(docsData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar portal do cliente:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEnviarContraproposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processoSelecionado) return;

    setEnviandoProposta(true);
    try {
      const procRef = doc(db, 'processos', processoSelecionado.id);
      await updateDoc(procRef, {
        status: 'EM_NEGOCIACAO',
        contraproposta_valor: Number(valorContraproposta),
        contraproposta_mensagem: justificativa,
        ultima_atualizacao: new Date().toISOString()
      });

      alert("Contraproposta submetida com sucesso! A nossa equipa irá avaliar e notificar a outra parte.");
      setModoNegociacao(false);
      setProcessoSelecionado(null);
    } catch (error) {
      alert("Erro ao enviar proposta.");
    } finally {
      setEnviandoProposta(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" /></div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Portal do Cliente</h1>
            <p className="text-slate-400 text-sm mt-1">Acompanhe o andamento dos seus conflitos de forma segura.</p>
          </div>
          <div className="text-xs bg-slate-800 text-slate-300 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ambiente Criptografado
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Folder className="w-5 h-5 text-amber-500" /> Os seus Casos Ativos</h2>
          
          {processos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-xl mx-auto">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700">Nenhum procedimento formal aberto</h3>
              <p className="text-slate-500 text-sm mt-1">A sua taxa de análise pode estar em verificação técnica pela nossa equipa de procuradores.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processos.map(proc => (
                <div 
                  key={proc.id} 
                  onClick={() => { setProcessoSelecionado(proc); setModoNegociacao(false); }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-slate-400">{proc.nup}</span>
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-bold">{proc.status}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-amber-600 transition-colors">Requerido: {proc.parte_contraria_nome}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{proc.resumo_fato}</p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 text-xs font-bold text-amber-500 text-right">
                    Visualizar Detalhes e Propostas →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALHADO INTERATIVO */}
      {processoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono text-slate-400">{processoSelecionado.nup}</span>
                  <h2 className="text-xl font-bold text-slate-800">Histórico do Procedimento</h2>
                </div>
                <button onClick={() => setProcessoSelecionado(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold bg-slate-100 px-3 py-1.5 rounded-lg">Fechar</button>
              </div>

              {!modoNegociacao ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                    <p className="text-slate-700"><strong>Parte Requerente:</strong> {processoSelecionado.cliente_nome}</p>
                    <p className="text-slate-700"><strong>Parte Requerida:</strong> {processoSelecionado.parte_contraria_nome}</p>
                    <p className="text-slate-700 mt-2"><strong>Fatos do Conflito:</strong> {processoSelecionado.resumo_fato}</p>
                  </div>

                  <button 
                    onClick={() => setModoNegociacao(true)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <MessageSquare className="w-5 h-5" /> Iniciar Proposta de Acordo
                  </button>
                </>
              ) : (
                <form onSubmit={handleEnviarContraproposta} className="space-y-4 animate-in fade-in">
                  <h3 className="font-bold text-slate-800">Formular Proposta Conclusiva</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Oferecido para Acordo (R$)</label>
                    <input 
                      type="number" step="0.01" required
                      value={valorContraproposta} onChange={e => setValorContraproposta(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Ex: 2500.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condições e Parcelamento</label>
                    <textarea 
                      required rows={4}
                      value={justificativa} onChange={e => setJustificativa(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Descreva como deseja realizar o pagamento..."
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setModoNegociacao(false)} className="w-1/3 bg-slate-100 font-bold p-3 rounded-xl text-slate-700 text-sm">Voltar</button>
                    <button type="submit" disabled={enviandoProposta} className="w-2/3 bg-slate-900 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                      {enviandoProposta ? 'Enviando...' : <><Send className="w-4 h-4"/> Enviar para a Câmara</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
