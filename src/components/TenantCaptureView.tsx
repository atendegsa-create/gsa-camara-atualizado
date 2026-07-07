import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Link as LinkIcon, Copy, CheckCircle2, Share2, Smartphone } from 'lucide-react';

export default function TenantCaptureView() {
  const { user, tenant } = useAuth();
  const [copiado, setCopiado] = useState(false);

  const baseUrl = window.location.hostname.includes('run.app') ? window.location.origin : 'https://72hrs.info';
  const linkPublico = `${baseUrl}/requerimento/${tenant?.slug || user?.tenantId}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Share2 className="text-amber-500 w-6 h-6" /> Captação Online
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Partilhe o seu link público para que os clientes preencham o requerimento de mediação diretamente.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Smartphone className="w-8 h-8" />
          </div>
          
          <div>
            <h2 className="text-lg font-bold text-slate-800">O Seu Link de Requerimento Oficial</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
              Coloque este link na biografia do Instagram da sua unidade ou envie pelo WhatsApp aos clientes interessados. Os dados entrarão diretamente no seu Monitor de Leads.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
            <div className="flex-1 w-full bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm font-mono text-slate-700 overflow-hidden text-ellipsis whitespace-nowrap">
              {linkPublico}
            </div>
            <button 
              onClick={copiarLink}
              className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all w-full sm:w-auto ${
                copiado ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiado ? <><CheckCircle2 className="w-5 h-5" /> Copiado!</> : <><Copy className="w-5 h-5" /> Copiar Link</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
