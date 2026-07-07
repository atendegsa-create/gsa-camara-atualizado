import React, { useState } from 'react';
import { Scale, FileSignature, AlertOctagon, ArrowRight, Loader2, CheckCircle2, AlertCircle, Save, Edit, Eye, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface ExecutionPanelProps {
  processId: string;
  status: string;
  currentDraft?: string;
  onRefresh: () => void;
}

export const JudicialExecutionPanel: React.FC<ExecutionPanelProps> = ({ processId, status, currentDraft, onRefresh }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedDraft, setEditedDraft] = useState(currentDraft || '');
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // Sync state if draft prop changes
  React.useEffect(() => {
    if (currentDraft) {
      setEditedDraft(currentDraft);
    }
  }, [currentDraft]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/execution/${processId}/generate-execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao acionar a geração da petição por IA.');
      
      onRefresh(); // Atualiza a página para carregar o novo status e o draft
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const docRef = doc(db, 'processos', processId);
      await updateDoc(docRef, {
        peticao_draft_markdown: editedDraft,
        updatedAt: serverTimestamp()
      });
      alert('Rascunho atualizado com sucesso!');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar rascunho: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Se o processo não estiver em vias de execução, esconde o painel
  if (status !== 'PAGAMENTO_ATRASO' && status !== 'JUDICIAL_AGUARDANDO_PETICAO') {
    return null;
  }

  return (
    <div className="mt-8 border-2 border-red-200 rounded-2xl overflow-hidden bg-white shadow-sm" id="judicial-execution-panel">
      <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center justify-between">
        <div className="flex items-center">
          <AlertOctagon className="w-6 h-6 text-red-600 mr-3 shrink-0" />
          <div>
            <h3 className="font-bold text-red-900 text-base sm:text-lg">Alerta de Inadimplência do Acordo</h3>
            <p className="text-red-700 text-xs sm:text-sm mt-0.5">O termo homologado extrajudicialmente não foi cumprido. O título possui força executiva imediata.</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!currentDraft && status === 'PAGAMENTO_ATRASO' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center max-w-xl mx-auto">
            <Scale className="w-16 h-16 text-red-100 bg-red-50 p-3 rounded-full mb-4 text-red-500 border border-red-200/50" />
            <h4 className="text-lg font-bold text-slate-800 mb-2">Escalonamento Judicial Imediato</h4>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Acione nossa inteligência artificial especializada para consolidar os dados do caso, os valores de multa pecuniária e redigir a Petição Inicial de Execução (Art. 784, IV do CPC) pronta para protocolo judicial.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center shadow-md shadow-red-100 cursor-pointer disabled:cursor-not-allowed gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> 
                  <span>Gerando Peça Jurídica com IA...</span>
                </>
              ) : (
                <>
                  <FileSignature className="w-5 h-5" /> 
                  <span>Gerar Petição de Execução (Art. 784, IV)</span>
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-2">
              <div className="flex items-center text-emerald-800 font-bold text-sm gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Petição Gerada com Sucesso. Aguardando revisão técnica do procurador.</span>
              </div>
              
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setMode('preview')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                    mode === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                    mode === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'preview' ? (
              <div className="p-6 bg-slate-50/80 rounded-xl border border-slate-200 h-96 overflow-y-auto font-sans text-slate-800 text-sm leading-relaxed prose prose-indigo max-w-none shadow-inner">
                <div className="markdown-body">
                  <ReactMarkdown>{editedDraft}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <textarea
                className="w-full h-96 p-4 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 text-slate-800 outline-none leading-relaxed"
                value={editedDraft}
                onChange={(e) => setEditedDraft(e.target.value)}
                placeholder="Rascunho de petição jurídica em Markdown..."
              />
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Regerar com IA
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer disabled:bg-slate-300 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Salvar Rascunho
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const docRef = doc(db, 'processos', processId);
                    updateDoc(docRef, { status: 'JUDICIAL' })
                      .then(() => {
                        alert('Status atualizado para Judicial Ativo!');
                        onRefresh();
                      })
                      .catch(err => {
                        console.error(err);
                        alert('Falha ao mover para Judicial.');
                      });
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Aprovar e Avançar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
