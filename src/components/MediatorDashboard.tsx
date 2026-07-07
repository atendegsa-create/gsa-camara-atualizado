import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Video, Calendar, Clock, FileText, CheckCircle2, AlertTriangle, Loader2, Sparkles, Send } from 'lucide-react';
import { apiUrl } from '../lib/apiClient';
import axios from 'axios';

export default function MediatorDashboard() {
  const { user, isMaster } = useAuth();
  const [audiencias, setAudiencias] = useState<any[]>([]);
  const [sessaoAtiva, setSessaoAtiva] = useState<any>(null);
  
  // Estados da Sessão de Mediação
  const [anotacoes, setAnotacoes] = useState('');
  const [ataGerada, setAtaGerada] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = isMaster 
      ? query(collection(db!, 'recovery_cobrancas'), where('status', '==', 'AGUARDANDO_AUDIENCIA'))
      : query(collection(db!, 'recovery_cobrancas'), where('tenantId', '==', user.tenantId || 'master'), where('status', '==', 'AGUARDANDO_AUDIENCIA'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAudiencias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, isMaster]);

  const handleGerarAtaIA = async () => {
    if (!sessaoAtiva || !anotacoes) return alert("Preencha as anotações da audiência primeiro.");
    setLoadingAI(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post(apiUrl('/api/recovery/gerar-ata'), {
        cobrancaId: sessaoAtiva.id,
        anotacoes_mediador: anotacoes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAtaGerada(response.data.ata_html);
    } catch (error) {
      alert("Erro ao processar IA do Gemini.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleFinalizarSessao = async (houveAcordo: boolean) => {
    if (!window.confirm(`Tem a certeza que deseja encerrar a sessão ${houveAcordo ? 'COM ACORDO' : 'SEM ACORDO'}?`)) return;
    setFinalizando(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(apiUrl('/api/recovery/finalizar-audiencia'), {
        cobrancaId: sessaoAtiva.id,
        houveAcordo,
        ataFinal: ataGerada || anotacoes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Sessão encerrada com sucesso! ${houveAcordo ? 'Cobrança Asaas gerada.' : ''}`);
      setSessaoAtiva(null);
      setAnotacoes('');
      setAtaGerada('');
    } catch (error) {
      alert("Erro ao finalizar a audiência.");
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Video className="text-indigo-500 fill-indigo-500 w-6 h-6" /> Painel do Mediador
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestão de pauta, condução de sessões on-line e elaboração de Atas com IA.</p>
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 font-bold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4"/> {audiencias.length} Sessões na Pauta
          </div>
        </div>

        {/* LISTA DE AUDIÊNCIAS AGENDADAS */}
        {!sessaoAtiva ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiencias.length === 0 && (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-600">Pauta Livre</h3>
                <p className="text-sm text-slate-400">Nenhuma mediação extrajudicial agendada para o momento.</p>
              </div>
            )}
            
            {audiencias.map(aud => (
              <div key={aud.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{aud.protocolo}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md"><Clock className="w-3 h-3"/> {aud.audiencia_agendada?.hora}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{aud.nome_devedor}</h3>
                <p className="text-sm text-slate-500 mt-1">Data: {new Date(aud.audiencia_agendada?.data).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm text-amber-600 font-semibold mt-1">Valor: R$ {aud.valor_divida?.toFixed(2)}</p>
                
                <div className="mt-5 pt-5 border-t border-slate-100 flex gap-2">
                  <a href={aud.audiencia_agendada?.linkMeet} target="_blank" rel="noreferrer" className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 transition-colors">
                    <Video className="w-3.5 h-3.5"/> Sala Virtual
                  </a>
                  <button onClick={() => setSessaoAtiva(aud)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center transition-colors">
                    Conduzir Sessão
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* MODO CONDUÇÃO DE SESSÃO ATIVA */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Video className="w-5 h-5 text-indigo-400"/> Em Sessão: {sessaoAtiva.nome_devedor}</h2>
                <p className="text-indigo-200 text-sm mt-1">Protocolo: {sessaoAtiva.protocolo} | Dívida Original: R$ {sessaoAtiva.valor_divida?.toFixed(2)}</p>
              </div>
              <button onClick={() => setSessaoAtiva(null)} className="text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">Sair da Sessão</button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LADO ESQUERDO: Notas do Mediador */}
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Anotações da Audiência (Rascunho)</label>
                <textarea 
                  className="w-full h-64 p-4 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50"
                  placeholder="Ex: O devedor compareceu. Alegou desemprego. Propôs pagar o valor de R$ 800,00 à vista no PIX até sexta-feira. A empresa credora aceitou..."
                  value={anotacoes} onChange={e => setAnotacoes(e.target.value)}
                />
                <button 
                  onClick={handleGerarAtaIA} disabled={loadingAI}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {loadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5"/> Redigir Ata Oficial com IA</>}
                </button>
              </div>

              {/* LADO DIREITO: Ata Gerada e Finalização */}
              <div className="space-y-4 flex flex-col h-full">
                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500"/> Documento Final</label>
                <div 
                  className="flex-1 w-full h-64 p-6 border border-amber-200 bg-amber-50/30 rounded-2xl text-sm font-serif leading-relaxed overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: ataGerada || '<span class="text-slate-400 italic">Ata será gerada pela Inteligência Artificial aqui...</span>' }}
                />
                
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleFinalizarSessao(false)} disabled={finalizando} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4"/> Encerrar SEM Acordo
                  </button>
                  <button onClick={() => handleFinalizarSessao(true)} disabled={finalizando || !ataGerada} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4"/> Homologar ACORDO (Gerar Pix)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
