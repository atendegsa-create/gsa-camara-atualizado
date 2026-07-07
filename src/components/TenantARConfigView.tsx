import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Settings, Save, CheckCircle2, MessageCircle } from 'lucide-react';

export default function TenantARConfigView() {
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [configAR, setConfigAR] = useState({
    mensagem_whatsapp: 'Notificação Oficial: Olá {{nome_requerido}}, foi aberto um procedimento de mediação extrajudicial contra si por {{nome_requerente}}. Aceda ao portal oficial para visualizar os termos da proposta e responder de forma sigilosa.'
  });

  useEffect(() => {
    if (tenant?.config_ar) {
      setConfigAR({
        mensagem_whatsapp: tenant.config_ar.mensagem_whatsapp || configAR.mensagem_whatsapp
      });
    }
  }, [tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;

    setLoading(true);
    try {
      const tenantRef = doc(db, 'tenants', user.tenantId);
      await updateDoc(tenantRef, {
        config_ar: configAR
      });
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar Configuração do AR:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-amber-500 w-6 h-6" /> Configuração do AR Online
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Personalize a mensagem automática que a parte contrária recebe ao ser intimada para a mediação.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800">
            <strong>Dica de Automação:</strong> Utilize as variáveis abaixo no seu texto. O sistema substituirá automaticamente no momento do disparo.
            <div className="flex gap-2 mt-2 font-mono text-xs">
              <span className="bg-amber-200/50 px-2 py-1 rounded">{'{{nome_requerido}}'}</span>
              <span className="bg-amber-200/50 px-2 py-1 rounded">{'{{nome_requerente}}'}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-emerald-500" /> Template do WhatsApp
            </label>
            <textarea 
              value={configAR.mensagem_whatsapp}
              onChange={e => setConfigAR({...configAR, mensagem_whatsapp: e.target.value})}
              rows={5}
              className="w-full border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50 text-slate-700"
            />
            <p className="text-xs text-slate-400 mt-2 text-right">O link rastreável exclusivo será inserido automaticamente no final desta mensagem.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
            {sucesso && <span className="text-emerald-500 flex items-center gap-2 font-semibold text-sm"><CheckCircle2 className="w-4 h-4"/> Configuração salva!</span>}
            <button 
              type="submit" 
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'A salvar...' : <><Save className="w-4 h-4" /> Atualizar Disparo</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
