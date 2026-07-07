import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { FileText, Send, CheckCircle2, QrCode, UploadCloud, Loader2 } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../lib/apiClient';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function ArOnlineManualView() {
  const { user, profile, isMaster, isAdminGeral } = useAuth();

  // Verifica se é Admin Master usando as mesmas regras do teu App.tsx
  const isAdmin = isMaster || profile?.tipo_usuario === 'MASTER' || profile?.tipo_usuario === 'MasterAdmin' || profile?.tipo_usuario === 'AdminGeral';

  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [sucessoData, setSucessoData] = useState<any>(null);

  const [valorArGlobal, setValorArGlobal] = useState('149.90');

  const [tipoEnvio, setTipoEnvio] = useState<'INDIVIDUAL' | 'LOTE'>('INDIVIDUAL');
  const [tipoDocumento, setTipoDocumento] = useState<'NOTIFICACAO' | 'PROCESSO'>('NOTIFICACAO');
  const [modoBase, setModoBase] = useState<'TEXTO' | 'ARQUIVO'>('TEXTO');
  const [arquivoBase, setArquivoBase] = useState<File | null>(null);
  const [arquivoPlanilha, setArquivoPlanilha] = useState<File | null>(null);

  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  // Formulário de Dados
  const [form, setForm] = useState({
    notificado_nome: '',
    notificado_documento: '',
    notificado_email: '',
    notificado_whatsapp: '',
    solicitante_nome: '',
    solicitante_documento: '',
    solicitante_email: '',
    solicitante_whatsapp: '',
    fato_resumo: '',
    isento_pagamento: false
  });

  // Busca o valor configurado pelo Admin Master
  useEffect(() => {
    const fetchConfigAndHistory = async () => {
      try {
        const configRef = doc(db, 'configuracoes', 'ar_online_manual');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setValorArGlobal(configSnap.data().valor_ar || '149.90');
        }

        // Fetch History
        let q;
        if (isAdmin) {
          q = query(collection(db, 'ar_online'), orderBy('criado_em', 'desc'));
        } else if (user?.tenantId) {
          q = query(collection(db, 'ar_online'), where('tenantId', '==', user.tenantId), orderBy('criado_em', 'desc'));
        }
        
        if (q) {
          const snap = await getDocs(q);
          setHistorico(snap.docs.map(d => ({id: d.id, ...(d.data() as any)})));
        }

      } catch (err) {
        console.error("Erro ao buscar config/historico de AR:", err);
      } finally {
        setLoadingConfig(false);
        setLoadingHistorico(false);
      }
    };
    fetchConfigAndHistory();
  }, [isAdmin, user?.tenantId]);

  const handleSalvarValor = async () => {
    try {
      await setDoc(doc(db, 'configuracoes', 'ar_online_manual'), { valor_ar: valorArGlobal }, { merge: true });
      alert("Valor atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar o valor.");
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.solicitante_nome || !form.solicitante_documento) {
      alert("Por favor, preencha os dados do solicitante.");
      return;
    }

    if (tipoEnvio === 'INDIVIDUAL' && (!form.notificado_nome)) {
      alert("Por favor, preencha o nome do notificado.");
      return;
    }

    if (tipoEnvio === 'LOTE' && !arquivoPlanilha) {
      alert("Por favor, anexe a planilha de notificados para o envio em lote.");
      return;
    }

    if (modoBase === 'TEXTO' && !form.fato_resumo) {
      alert("Por favor, preencha o resumo dos fatos.");
      return;
    }

    if (modoBase === 'ARQUIVO' && !arquivoBase) {
      alert("Por favor, anexe o documento base.");
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post(apiUrl('/api/ar/criar'), {
        ...form,
        tipo_envio: tipoEnvio,
        tipo_documento: tipoDocumento,
        modo_base: modoBase,
        valor_ar: valorArGlobal,
        isento_pagamento: isAdmin ? form.isento_pagamento : false // Força falso para Tenants
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSucessoData(response.data);
    } catch (err: any) {
      alert("Erro ao processar criação de AR: " + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            AR Online Manual
          </h1>
          <p className="text-sm text-slate-500 mt-1">Envie notificações extrajudiciais avulsas com validade jurídica.</p>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Configuração Admin: Valor da AR (R$)</label>
            <input 
              type="number" step="0.01" 
              className="w-full p-2.5 border border-slate-300 rounded-lg font-bold" 
              value={valorArGlobal} 
              onChange={e => setValorArGlobal(e.target.value)} 
            />
          </div>
          <button onClick={handleSalvarValor} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
            Salvar Valor Padrão
          </button>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
          <span className="text-amber-800 font-bold text-sm">Custo unitário para emissão desta AR Online:</span>
          <span className="text-amber-900 font-black text-lg">R$ {Number(valorArGlobal).toFixed(2).replace('.', ',')}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
        {!sucessoData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* TIPO DE DOCUMENTO E ENVIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase">Tipo de Documento</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => setTipoDocumento('NOTIFICACAO')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tipoDocumento === 'NOTIFICACAO' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Somente Notificação</button>
                  <button type="button" onClick={() => setTipoDocumento('PROCESSO')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tipoDocumento === 'PROCESSO' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Processo Administrativo</button>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase">Modalidade de Envio</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => setTipoEnvio('INDIVIDUAL')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tipoEnvio === 'INDIVIDUAL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
                  <button type="button" onClick={() => setTipoEnvio('LOTE')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tipoEnvio === 'LOTE' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Em Lote (Planilha)</button>
                </div>
              </div>
            </div>

            {/* DADOS DO NOTIFICANTE/SOLICITANTE */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="col-span-1 md:col-span-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Dados do Requerente / Solicitante</h3>
              <input type="text" placeholder="Nome Completo / Razão (*)" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.solicitante_nome} onChange={e => setForm({...form, solicitante_nome: e.target.value})} />
              <input type="text" placeholder="CPF ou CNPJ (*)" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.solicitante_documento} onChange={e => setForm({...form, solicitante_documento: e.target.value})} />
              <input type="email" placeholder="E-mail" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.solicitante_email} onChange={e => setForm({...form, solicitante_email: e.target.value})} />
              <input type="text" placeholder="WhatsApp (DDD+Número)" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.solicitante_whatsapp} onChange={e => setForm({...form, solicitante_whatsapp: e.target.value})} />
            </div>

            {/* DADOS DO REQUERIDO/NOTIFICADO */}
            {tipoEnvio === 'INDIVIDUAL' ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                <h3 className="col-span-1 md:col-span-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Dados do Notificado (Parte Contrária)</h3>
                <input type="text" placeholder="Nome do Notificado (*)" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.notificado_nome} onChange={e => setForm({...form, notificado_nome: e.target.value})} />
                <input type="text" placeholder="CPF/CNPJ Conhecido" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.notificado_documento} onChange={e => setForm({...form, notificado_documento: e.target.value})} />
                <input type="email" placeholder="E-mail Destinatário" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.notificado_email} onChange={e => setForm({...form, notificado_email: e.target.value})} />
                <input type="text" placeholder="WhatsApp Destinatário" className="p-3 bg-white border border-slate-300 rounded-xl text-sm" value={form.notificado_whatsapp} onChange={e => setForm({...form, notificado_whatsapp: e.target.value})} />
              </div>
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col items-center justify-center border-dashed">
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">Anexar Planilha de Lote (CSV, XLSX)</h3>
                <p className="text-xs text-slate-500 mb-4 text-center max-w-md">A planilha deve conter colunas para Nome, CPF/CNPJ, Email e WhatsApp.</p>
                <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={e => setArquivoPlanilha(e.target.files?.[0] || null)} />
              </div>
            )}

            {/* MOTIVOS DA NOTIFICAÇÃO / BASE DOCUMENTAL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  {tipoDocumento === 'NOTIFICACAO' ? 'Base da Notificação (*)' : 'Base do Processo Administrativo (*)'}
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setModoBase('TEXTO')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${modoBase === 'TEXTO' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Digitar</button>
                  <button type="button" onClick={() => setModoBase('ARQUIVO')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${modoBase === 'ARQUIVO' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Anexar Arquivo</button>
                </div>
              </div>

              {modoBase === 'TEXTO' ? (
                <textarea rows={4} className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder={tipoDocumento === 'NOTIFICACAO' ? "Ex: Descrever quebra de contrato de prestação de serviços educacionais e falta de pagamento de parcelas..." : "Descreva os fatos para abertura do processo administrativo na Câmara..."} value={form.fato_resumo} onChange={e => setForm({...form, fato_resumo: e.target.value})} />
              ) : (
                <div className="w-full border border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center border-dashed bg-slate-50">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700 mb-2">Anexar Documento Base (PDF, DOCX)</p>
                  <input type="file" accept=".pdf, .doc, .docx" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={e => setArquivoBase(e.target.files?.[0] || null)} />
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <input type="checkbox" id="isento" className="w-5 h-5 rounded border-slate-300 accent-amber-500" checked={form.isento_pagamento} onChange={e => setForm({...form, isento_pagamento: e.target.checked})} />
                <label htmlFor="isento" className="text-sm font-bold text-slate-800 cursor-pointer">Isentar Taxa (Liberar AR Imediatamente e não gerar cobrança para a unidade/cliente)</label>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 hover:bg-amber-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-base disabled:opacity-50">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin"/> Processando...</> : <><Send className="w-5 h-5"/> Gerar e Processar AR Online</>}
            </button>
          </form>
        ) : (
          /* TELA DE RETORNO DO SUCESSO DO SISTEMA */
          <div className="text-center py-10 space-y-6">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto" />
            <h3 className="text-2xl font-bold text-slate-800">AR Processada com Sucesso!</h3>
            <p className="text-base text-slate-600 max-w-lg mx-auto">{sucessoData.message}</p>
            
            {sucessoData.status === 'AGUARDANDO_PAGAMENTO' && (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-6 text-center max-w-sm mx-auto space-y-4">
                <p className="text-sm font-bold text-slate-500 uppercase">Aguardando Liquidação Financeira</p>
                <QrCode className="w-40 h-40 text-slate-800 mx-auto border-2 border-slate-200 p-3 bg-white rounded-2xl shadow-sm" />
                <button 
                  onClick={async () => {
                    await axios.post(apiUrl(`/api/ar/webhook-pagamento/${sucessoData.ar_id}`));
                    alert("O pagamento foi confirmado!\n\nA Notificação AR foi disparada por E-mail e WhatsApp para a parte contrária. Você também receberá uma cópia no seu E-mail.");
                    setSucessoData(null);
                    setForm({ ...form, fato_resumo: '', notificado_nome: '', notificado_documento: '', notificado_email: '', notificado_whatsapp: '' });
                  }}
                  className="bg-emerald-600 text-white font-bold text-sm px-4 py-3 rounded-xl hover:bg-emerald-700 w-full transition-colors"
                >
                  [Simular Pagamento do Cliente]
                </button>
              </div>
            )}
            
            <div className="pt-6 flex flex-col items-center gap-4">
              <a href={`https://camara.gsa.com/conferir-ar/${sucessoData.ar_id}`} target="_blank" className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors">
                <FileText className="w-5 h-5"/> Acessar Link da AR
              </a>
              <button onClick={() => { setSucessoData(null); setForm({ ...form, fato_resumo: '', notificado_nome: '', notificado_documento: '', notificado_email: '', notificado_whatsapp: '' }); }} className="text-slate-500 hover:text-slate-800 font-bold text-sm underline">
                Emitir nova AR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HISTÓRICO DE ENVIOS E RECIBOS */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Histórico de Envios (AR Online)
        </h2>
        
        {loadingHistorico ? (
          <div className="text-center text-sm text-slate-500 py-6">Carregando histórico...</div>
        ) : historico.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-6">Nenhum envio registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 rounded-tl-xl">Data / ID</th>
                  <th className="p-4">Requerente</th>
                  <th className="p-4">Notificado</th>
                  <th className="p-4">Status / Leitura</th>
                  <th className="p-4 rounded-tr-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {historico.map(ar => (
                  <tr key={ar.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="block font-bold text-slate-900">{new Date(ar.criado_em).toLocaleDateString('pt-BR')}</span>
                      <span className="block text-xs font-mono text-slate-500">{ar.nup_ar || ar.id.substring(0, 8)}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-semibold">{ar.solicitante_nome}</span>
                      <span className="block text-xs text-slate-500">{ar.solicitante_documento}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-semibold">{ar.notificado_nome || 'Lote/Planilha'}</span>
                      <span className="block text-xs text-slate-500">{ar.notificado_documento || 'Múltiplos'}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ar.status === 'LIBERADO_ENVIO' ? 'bg-emerald-100 text-emerald-700' :
                        ar.status === 'AGUARDANDO_PAGAMENTO' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ar.status === 'LIBERADO_ENVIO' ? 'Enviado' : 'Aguardando Pgto'}
                      </span>
                      {ar.lido_em && (
                        <span className="block text-[10px] text-indigo-600 mt-1 font-bold">Lido: {new Date(ar.lido_em).toLocaleDateString('pt-BR')}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button onClick={() => alert('Emissão de Recibo Oficial da Câmara em desenvolvimento...')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors border border-slate-200">
                        Gerar Recibo Oficial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
