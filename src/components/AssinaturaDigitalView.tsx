import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { PenTool, Plus, RefreshCw, Mail, Download, Shield } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';

export default function AssinaturaDigitalView() {
  const { user, profile, isMaster, isAdminGeral, isAdminUnidade } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assinaturasGlobais, setAssinaturasGlobais] = useState<any[]>([]);
  const [modalNovaAssinatura, setModalNovaAssinatura] = useState(false);

  const [formAssinatura, setFormAssinatura] = useState({ titulo: '' });
  const [signatarios, setSignatarios] = useState<{ nome: string; email: string }[]>([{ nome: '', email: '' }]);
  const [arquivoAssinatura, setArquivoAssinatura] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const adicionarSignatario = () => setSignatarios([...signatarios, { nome: '', email: '' }]);
  const atualizarSignatario = (index: number, campo: 'nome' | 'email', valor: string) => {
    const novos = [...signatarios];
    novos[index][campo] = valor;
    setSignatarios(novos);
  };
  
  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleAdminDispararAssinatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoAssinatura) return alert("Anexe o PDF da minuta/contrato.");
    setLoading(true);
    try {
      const fullBase64 = await toBase64(arquivoAssinatura);
      const documentBase64 = fullBase64.split(',')[1]; 

      const token = await auth.currentUser?.getIdToken();

      await axios.post(apiUrl('/api/recovery/criar-assinatura'), {
        titulo: formAssinatura.titulo,
        signatarios,
        tenantId: profile?.tenantId || profile?.unidadeId || 'master',
        fileName: arquivoAssinatura.name,
        documentBase64
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Fluxo de assinatura iniciado!");
      setModalNovaAssinatura(false);
      setFormAssinatura({ titulo: '' });
      setSignatarios([{ nome: '', email: '' }]);
      setArquivoAssinatura(null);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Erro desconhecido";
      console.error("APP_ERROR_LOG:", msg);
      alert(`⚠️ ERRO:\n${typeof msg === 'object' ? JSON.stringify(msg) : msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !profile) return;
    const userTenantId = profile.tenantId || profile.unidadeId || 'master';
    const qAssinaturas = (isMaster || isAdminGeral)
      ? query(collection(db!, 'recovery_assinaturas'))
      : query(collection(db!, 'recovery_assinaturas'), where('tenantId', '==', userTenantId));

    const unsubAssinaturas = onSnapshot(qAssinaturas, (snapshot) => {
      setAssinaturasGlobais(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn("recovery_assinaturas onSnapshot error:", err));

    return () => { unsubAssinaturas(); };
  }, [user, profile, isMaster, isAdminGeral]);

  const handleReenviarEmail = async (id: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(apiUrl(`/api/recovery/assinatura/${id}/reenviar`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("✅ Lembrete de assinatura enviado!\n\nOs signatários pendentes receberão um novo e-mail em instantes.");
    } catch (err: any) {
      alert(`⚠️ Ops! Houve um problema ao enviar o lembrete.\n\nDetalhes do sistema: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleAtualizarStatus = async (id: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await axios.post(apiUrl(`/api/recovery/assinatura/${id}/sincronizar`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ Status sincronizado com sucesso!\n\nSituação atual: ${resp.data.status}`);
    } catch (err: any) {
      alert(`⚠️ Não foi possível sincronizar no momento.\n\nDetalhes: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <PenTool className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" /> Assinatura Digital
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Gestão de contratos e atas eletrônicas.</p>
          </div>
          <button onClick={() => setModalNovaAssinatura(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md transition-all">
            <Plus className="w-4 h-4"/> Lançar Assinatura
          </button>
        </div>

        <div className="animate-in fade-in">
             <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">Monitoramento Geral de Atas e Contratos Eletrônicos</div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase">
                    <th className="p-4">Título do Documento</th>
                    <th className="p-4">Signatários</th>
                    <th className="p-4">Origem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {assinaturasGlobais.map(ass => (
                    <tr key={ass.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-bold text-slate-900">{ass.titulo}</td>
                      <td className="p-4 text-slate-500">{ass.quantidade_signatarios} Destinatários</td>
                      <td className="p-4 font-mono text-indigo-600 text-[10px]">{ass.tenantId || 'master'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${ass.status === 'ASSINADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {ass.status || 'Coletando'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex gap-1 justify-end">
                        {ass.link_download_final && (
                          <a href={ass.link_download_final} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px]">Ver Certificado</a>
                        )}
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[10px] transition-colors" title="Simular o reenvio de e-mails para os signatários" onClick={() => handleReenviarEmail(ass.id)}>
                          Reenviar
                        </button>
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[10px] transition-colors" title="Sincronizar status" onClick={() => handleAtualizarStatus(ass.id)}>
                          Sincronizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assinaturasGlobais.length === 0 && <div className="p-8 text-center text-slate-400 font-medium">Nenhum fluxo de assinatura encontrado.</div>}
            </div>

            <div className="md:hidden space-y-4">
              {assinaturasGlobais.map(ass => (
                <div key={ass.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-slate-900 leading-tight">{ass.titulo}</p>
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] border ${ass.status === 'ASSINADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {ass.status || 'Coletando'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{ass.quantidade_signatarios} Destinatários | Origem: <span className="font-mono text-indigo-600">{ass.tenantId || 'master'}</span></p>
                  <div className="flex gap-1 justify-end pt-2 border-t border-slate-100">
                    {ass.link_download_final && (
                      <a href={ass.link_download_final} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]">Certificado</a>
                    )}
                    <button className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px]" onClick={() => handleReenviarEmail(ass.id)}>
                      Reenviar
                    </button>
                    <button className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px]" onClick={() => handleAtualizarStatus(ass.id)}>
                      Sincronizar
                    </button>
                  </div>
                </div>
              ))}
              {assinaturasGlobais.length === 0 && <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border">Nenhum fluxo de assinatura encontrado.</div>}
            </div>
        </div>
      </div>

      {/* MODAL NOVA ASSINATURA */}
      <AnimatePresence>
        {modalNovaAssinatura && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Novo Fluxo de Assinatura</h3>
                <button onClick={() => setModalNovaAssinatura(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
              </div>
              <form onSubmit={handleAdminDispararAssinatura} className="p-6 space-y-6">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Título do Documento</label>
                  <input type="text" value={formAssinatura.titulo} onChange={e => setFormAssinatura({...formAssinatura, titulo: e.target.value})} placeholder="Ex: Contrato de Honorários" required className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="block text-sm font-bold text-slate-700">Signatários</label>
                    <button type="button" onClick={adicionarSignatario} className="text-indigo-600 hover:bg-indigo-50 font-bold text-xs px-2 py-1 rounded">
                      + Adicionar outro
                    </button>
                  </div>
                  
                  {signatarios.map((sig, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl relative">
                      {index > 0 && (
                        <button type="button" onClick={() => setSignatarios(signatarios.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-sm">
                          &times;
                        </button>
                      )}
                      <div>
                        <input type="text" value={sig.nome} onChange={e => atualizarSignatario(index, 'nome', e.target.value)} placeholder="Nome Completo" required className="w-full p-2.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                      <div>
                        <input type="email" value={sig.email} onChange={e => atualizarSignatario(index, 'email', e.target.value)} placeholder="E-mail" required className="w-full p-2.5 border border-slate-200 rounded-lg text-xs" />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Anexar Documento (PDF)</label>
                  <input type="file" ref={fileInputRef} accept="application/pdf" onChange={e => setArquivoAssinatura(e.target.files?.[0] || null)} required className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                  <p className="text-[10px] text-slate-500 mt-2">O documento receberá uma folha de rosto com as chaves criptográficas de comprovação legal (ICP-Brasil Padrão).</p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setModalNovaAssinatura(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    {loading ? 'Aguarde...' : 'Disparar Assinaturas'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
