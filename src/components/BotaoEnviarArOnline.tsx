import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { FileText, Send, DollarSign, ShieldAlert, CheckCircle2, QrCode } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../lib/apiClient';
import { auth } from '../lib/firebase';

interface BotaoEnviarArOnlineProps {
  processo?: any;
  tenantSlug?: string;
}

export default function BotaoEnviarArOnline({ processo, tenantSlug }: BotaoEnviarArOnlineProps) {
  const { user, profile, isMaster } = useAuth();

  // Verifica se é Admin Master usando as mesmas regras do teu App.tsx
  const isAdmin = isMaster || profile?.tipo_usuario === 'MASTER' || profile?.tipo_usuario === 'MasterAdmin' || profile?.tipo_usuario === 'AdminGeral';

  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucessoData, setSucessoData] = useState<any>(null);

  // Formulário de Dados
  const [form, setForm] = useState({
    notificado_nome: processo?.parte_contraria_nome || '',
    notificado_documento: '',
    notificado_email: processo?.parte_contraria_email || '',
    notificado_whatsapp: processo?.parte_contraria_telefone || '',
    solicitante_nome: processo?.cliente_nome || '',
    solicitante_documento: processo?.cliente_cpf || '',
    solicitante_email: processo?.cliente_email || '',
    solicitante_whatsapp: processo?.cliente_telefone || '',
    fato_resumo: processo?.resumo_fato || '',
    valor_ar: '149.90',
    isento_pagamento: false
  });

  const [valorArGlobal, setValorArGlobal] = useState('149.90');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const configSnap = await getDoc(doc(db, 'configuracoes', 'ar_online_manual'));
        if (configSnap.exists() && configSnap.data().valor_ar) {
          setValorArGlobal(configSnap.data().valor_ar);
          setForm(prev => ({ ...prev, valor_ar: configSnap.data().valor_ar }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (modalAberto) fetchConfig();
  }, [modalAberto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.solicitante_nome || !form.solicitante_documento || !form.notificado_nome || !form.fato_resumo) {
      alert("Por favor, preencha todos os campos obrigatórios marcados com (*).");
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post(apiUrl('/api/ar/criar'), {
        ...form,
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

  return (
    <>
      <button 
        onClick={() => { setModalAberto(true); setSucessoData(null); }}
        className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-sm"
      >
        <FileText className="w-4 h-4" /> Emitir AR Online (Manual)
      </button>

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">🚀 Nova Notificação Extrajudicial</h2>
                <p className="text-xs text-slate-500 mt-0.5">Módulo unificado GSA Câmara Omnichannel</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 px-3 py-1.5 rounded-lg text-xs">Fechar</button>
            </div>

            {!sucessoData ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* DADOS DO NOTIFICANTE/SOLICITANTE */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <h3 className="col-span-1 md:col-span-2 text-xs font-bold text-amber-600 uppercase tracking-wider">Dados do Requerente / Solicitante</h3>
                  <input type="text" placeholder="Nome Completo / Razão (*)" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.solicitante_nome} onChange={e => setForm({...form, solicitante_nome: e.target.value})} />
                  <input type="text" placeholder="CPF ou CNPJ (*)" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.solicitante_documento} onChange={e => setForm({...form, solicitante_documento: e.target.value})} />
                  <input type="email" placeholder="E-mail" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.solicitante_email} onChange={e => setForm({...form, solicitante_email: e.target.value})} />
                  <input type="text" placeholder="WhatsApp (DDD+Número)" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.solicitante_whatsapp} onChange={e => setForm({...form, solicitante_whatsapp: e.target.value})} />
                </div>

                {/* DADOS DO REQUERIDO/NOTIFICADO */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <h3 className="col-span-1 md:col-span-2 text-xs font-bold text-red-500 uppercase tracking-wider">Dados do Notificado (Parte Contrária)</h3>
                  <input type="text" placeholder="Nome do Notificado (*)" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.notificado_nome} onChange={e => setForm({...form, notificado_nome: e.target.value})} />
                  <input type="text" placeholder="CPF/CNPJ Conhecido" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.notificado_documento} onChange={e => setForm({...form, notificado_documento: e.target.value})} />
                  <input type="email" placeholder="E-mail Destinatário" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.notificado_email} onChange={e => setForm({...form, notificado_email: e.target.value})} />
                  <input type="text" placeholder="WhatsApp Destinatário" className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm" value={form.notificado_whatsapp} onChange={e => setForm({...form, notificado_whatsapp: e.target.value})} />
                </div>

                {/* MOTIVOS DA NOTIFICAÇÃO */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Resumo dos Fatos da Notificação (A IA usará isto para redigir a peça) (*)</label>
                  <textarea rows={3} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500" placeholder="Ex: Descrever quebra de contrato de prestação de serviços educacionais e falta de pagamento de parcelas..." value={form.fato_resumo} onChange={e => setForm({...form, fato_resumo: e.target.value})} />
                </div>

                {/* PREÇO E FINANÇAS */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-amber-50/40 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Preço Estipulado para esta AR (R$)</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">R$</span>
                      <input type="number" step="0.01" className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm font-bold bg-slate-100 text-slate-500 cursor-not-allowed" value={valorArGlobal} disabled={true} />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                      <input type="checkbox" id="isento" className="w-4 h-4 rounded border-slate-300 accent-amber-500" checked={form.isento_pagamento} onChange={e => setForm({...form, isento_pagamento: e.target.checked})} />
                      <label htmlFor="isento" className="text-xs font-bold text-slate-800 cursor-pointer">Isentar Taxa (Liberar AR Imediatamente)</label>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-40">
                  {loading ? 'Processando Engenharia Jurídica da IA...' : <><Send className="w-4 h-4"/> Gerar e Processar AR</>}
                </button>
              </form>
            ) : (
              /* TELA DE RETORNO DO SUCESSO DO SISTEMA */
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <h3 className="text-xl font-bold text-slate-800">AR Processada com Sucesso!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">{sucessoData.message}</p>
                
                {sucessoData.status === 'AGUARDANDO_PAGAMENTO' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4 text-center max-w-xs mx-auto space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase">Aguardando Liquidação Financeira</p>
                    <QrCode className="w-32 h-32 text-slate-800 mx-auto border p-2 bg-white rounded-lg shadow-sm" />
                    <button 
                      onClick={async () => {
                        await axios.post(apiUrl(`/api/ar/webhook-pagamento/${sucessoData.ar_id}`));
                        alert("O pagamento foi confirmado!\n\nA Notificação AR foi disparada por E-mail e WhatsApp para a parte contrária. Você também receberá uma cópia no seu E-mail.");
                        setModalAberto(false);
                      }}
                      className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 w-full"
                    >
                      [Simular Pagamento do Cliente]
                    </button>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-100 flex justify-center gap-2">
                  <a href={`https://camara.gsa.com/conferir-ar/${sucessoData.ar_id}`} target="_blank" className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"><FileText className="w-4 h-4"/> Acessar Link da AR</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
