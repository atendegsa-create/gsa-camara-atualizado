import { useState } from 'react';
import { Briefcase, Building } from 'lucide-react';
import { JuridicoLaunchForm } from './JuridicoLaunchForm'; // Certifique-se que tem este componente

export default function JuridicoPanelView() {
  const [modalJuridico, setModalJuridico] = useState<'INTERNO' | 'PARTICULAR' | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in text-slate-900">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Briefcase className="text-blue-900 w-7 h-7" /> Módulo Jurídico - Câmara GSA
        </h1>
        <p className="text-slate-500 text-sm mt-1">Lançamento, distribuição e acompanhamento de contencioso interno e externo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD: JURÍDICO INTERNO (HLF) */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl text-indigo-900 mb-2">Jurídico Interno - HLF</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Envie o caso diretamente para a equipa jurídica corporativa. O advogado receberá um link imediato por e-mail para analisar os arquivos e responder.
            </p>
          </div>
          <button onClick={() => setModalJuridico('INTERNO')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all">
            Iniciar Processo HLF
          </button>
        </div>

        {/* CARD: JURÍDICO PARTICULAR */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl text-emerald-900 mb-2">Jurídico Particular</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Encaminhe a documentação para o e-mail de um advogado externo da sua confiança. Ele usará um link mágico para interagir com o processo.
            </p>
          </div>
          <button onClick={() => setModalJuridico('PARTICULAR')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all">
            Iniciar Processo Externo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase">
          Acompanhamento de Processos Enviados
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase">
              <th className="p-4">Cliente / Processo</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Advogado Destino</th>
              <th className="p-4">Status Atual</th>
              <th className="p-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            <tr>
              <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                Nenhum processo enviado para análise jurídica nesta sessão.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {modalJuridico && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg relative">
            <button onClick={() => setModalJuridico(null)} className="absolute -top-10 right-0 text-white font-bold">FECHAR (X)</button>
            <JuridicoLaunchForm tipo={modalJuridico} onClose={() => setModalJuridico(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
