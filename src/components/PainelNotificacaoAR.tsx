import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Mail, MessageSquare, ShieldAlert, CheckCircle2, Clock, ExternalLink } from 'lucide-react';

export default function PainelNotificacaoAR() {
  const { user, profile, isAdmin } = useAuth();
  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    // Se for Unidade Credenciada (Tenant), filtra apenas os dados dele
    const q = isAdmin
      ? collection(db, 'ar_online')
      : query(collection(db, 'ar_online'), where('tenantId', '==', profile.tenantId || ''));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificacoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("AR Notificacoes - onSnapshot ignorado:", error);
    });

    return () => unsubscribe();
  }, [user, profile, isAdmin]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Módulo de AR Online - Notificações Extrajudiciais</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gerenciamento Omnichannel de conflitos manuais com barreira de pagamento integrado.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 text-white font-semibold">
              <th className="p-4 text-xs font-bold uppercase tracking-wider">NUP / Registro</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider">Solicitante</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider">Notificado</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider">Valor Cobrado</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider">Status Liberação</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider">Canais</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notificacoes.map((ar) => (
              <tr key={ar.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono font-bold text-xs text-slate-500">{ar.nup_ar}</td>
                <td className="p-4 font-medium text-slate-800">{ar.solicitante_nome}</td>
                <td className="p-4 text-slate-600">{ar.notificado_nome}</td>
                <td className="p-4 font-bold text-slate-900">R$ {ar.valor_ar?.toFixed(2)}</td>
                <td className="p-4">
                  {ar.status === 'LIBERADO_ENVIO' ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Liberado & Enviado
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                      <Clock className="w-3.5 h-3.5" /> Bloqueado (Aguardando PIX)
                    </span>
                  )}
                </td>
                <td className="p-4 flex gap-2">
                  <a href={`https://camara.gsa.com/conferir-ar/${ar.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Acessar Link Público"><ExternalLink className="w-4 h-4" /></a>
                  <Mail className={`w-4 h-4 mt-2 ${ar.status === 'LIBERADO_ENVIO' ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <MessageSquare className={`w-4 h-4 mt-2 ${ar.status === 'LIBERADO_ENVIO' ? 'text-emerald-500' : 'text-slate-300'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
