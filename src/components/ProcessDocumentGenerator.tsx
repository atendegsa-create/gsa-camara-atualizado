import React, { useState } from 'react';
import { Bot, FileText, Save, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { auth } from '../lib/firebase';

interface Props {
  processo: any;
  tenant: any;
}

export default function ProcessDocumentGenerator({ processo, tenant }: Props) {
  const [loading, setLoading] = useState(false);
  const [documentoHtml, setDocumentoHtml] = useState('');
  const [copiado, setCopiado] = useState(false);

  const gerarDocumentoIA = async (tipo: string) => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/ai/gerar-minuta', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          processo,
          tenant,
          tipoDocumento: tipo
        })
      });

      const data = await response.json();
      if (data.success) {
        setDocumentoHtml(data.conteudo);
      } else {
        alert('Erro ao gerar documento: ' + data.error);
      }
    } catch (error) {
      alert('Erro de conexão com o motor de IA.');
    } finally {
      setLoading(false);
    }
  };

  const copiarTexto = () => {
    // Cria um elemento temporário para converter o HTML em texto limpo para o clipboard
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = documentoHtml;
    navigator.clipboard.writeText(tempDiv.innerText);
    
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
        <Bot className="w-6 h-6 text-indigo-500" />
        <div>
          <h3 className="font-bold text-slate-800">Assistente Jurídico com IA</h3>
          <p className="text-xs text-slate-500">Gere minutas e notificações instantaneamente com base nos dados deste processo.</p>
        </div>
      </div>

      {!documentoHtml && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={() => gerarDocumentoIA('Termo de Acordo Extrajudicial')}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-3 px-4 rounded-xl transition-colors border border-indigo-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Gerar Termo de Acordo</>}
          </button>
          
          <button 
            onClick={() => gerarDocumentoIA('Notificação Extrajudicial (Intimação)')}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Gerar Notificação</>}
          </button>
        </div>
      )}

      {documentoHtml && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-t-xl border border-b-0 border-slate-200">
             <span className="text-xs font-bold text-slate-500 uppercase ml-2">Editor de Minuta</span>
             <div className="flex gap-2">
               <button onClick={copiarTexto} className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                 {copiado ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <Copy className="w-4 h-4"/>} {copiado ? 'Copiado' : 'Copiar Texto'}
               </button>
               <button onClick={() => setDocumentoHtml('')} className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100">
                 Descartar
               </button>
             </div>
          </div>
          
          {/* Editor de texto rico (usamos contentEditable para o procurador poder ajustar algo antes de copiar/salvar) */}
          <div 
            className="w-full h-96 overflow-y-auto p-6 bg-white border border-slate-200 rounded-b-xl text-sm text-slate-700 font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
            contentEditable
            dangerouslySetInnerHTML={{ __html: documentoHtml }}
            onBlur={(e) => setDocumentoHtml(e.currentTarget.innerHTML)}
          />
          
          <div className="flex justify-end">
             <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-md transition-all">
               <Save className="w-4 h-4" /> Salvar nos Documentos do Processo
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
