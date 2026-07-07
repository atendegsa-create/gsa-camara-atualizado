import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  Save, 
  Edit3, 
  Eye, 
  X,
  Loader2,
  FileCheck,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, collection, addDoc } from 'firebase/firestore';

import { jsPDF } from 'jspdf';
import { prepararDocumentoParaAssinatura, enviarParaAssinatura } from '../services/signatureService';

interface DocumentDraftPreviewProps {
  processoId: string;
  onClose: () => void;
  onSave?: (minuta: string) => void;
}

export function DocumentDraftPreview({ processoId, onClose, onSave }: DocumentDraftPreviewProps) {
  const [draft, setDraft] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const { user, profile } = useAuth();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/ai/gerar-minuta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ processoId })
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar minuta');
      }
      const data = await response.json();
      if (data.success) {
        setDraft(data.minuta);
        setMode('edit');
      } else {
        throw new Error(data.error || 'Erro ao gerar minuta');
      }
    } catch (error) {
      console.error(error);
      alert('Falha ao gerar minuta com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalizeAndSign = async () => {
    if (!draft) return;
    setIsFinalizing(true);
    try {
      // 1. Gera PDF do Termo
      const docPdf = new jsPDF();
      docPdf.setFontSize(16);
      docPdf.text('TERMO DE ACORDO EXTRAJUDICIAL', 105, 20, { align: 'center' });
      docPdf.setFontSize(11);
      
      const splitText = docPdf.splitTextToSize(draft, 180);
      docPdf.text(splitText, 15, 40);
      
      const pdfBlob = docPdf.output('blob');
      
      // 2. Cofre de Evidências: Calcula e Guarda Hash
      const hash = await prepararDocumentoParaAssinatura(processoId, pdfBlob);
      
      // 3. Envia para Assinatura (Simulado)
      // Em produção, aqui você faria o upload do Blob para o Firebase Storage primeiro
      // e depois enviaria a URL para o ZapSign.
      
      const res = await enviarParaAssinatura({ id: processoId, nup: 'GSA-' + processoId }, 'PDF_BASE64_SIMULADO');
      
      if (res.success) {
        alert(`Documento finalizado e enviado para assinatura!\nHash SHA-256: ${hash}\nLink: ${res.sign_url}`);
        onClose();
        if (onSave) onSave(draft);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao finalizar documento.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const processRef = doc(db, 'processos', processoId);
      const logMessage = `Minuta de documento gerada/atualizada por ${profile?.nome_completo || 'Usuário'}`;
      
      // Registrar na subcoleção de auditoria
      await addDoc(collection(db, 'processos', processoId, 'logs'), {
        tipo: 'IA',
        mensagem: logMessage,
        autor_id: user?.uid || 'SISTEMA',
        autor_nome: profile?.nome_completo || 'Usuário GSA',
        is_ia: true,
        createdAt: serverTimestamp()
      });

      await updateDoc(processRef, {
        minuta_gerada: draft,
        ultima_minuta_data: serverTimestamp(),
        logs: arrayUnion({
          data: new Date().toISOString(),
          mensagem: logMessage,
          status: 'IA_DRAFT',
          tipo: 'SISTEMA'
        })
      });
      
      if (onSave) onSave(draft);
      alert('Minuta salva com sucesso nos autos!');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar minuta.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden text-gray-900"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-900">IA Preditiva: Minuta de Acordo</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Redação Automática de Termos Jurídicos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!draft && !isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                <FileText size={40} />
              </div>
              <h4 className="text-2xl font-serif font-bold text-gray-900 mb-2">Nenhuma minuta gerada</h4>
              <p className="text-gray-500 max-w-sm mb-8 font-medium">
                Clique no botão abaixo para que o Gemini analise os autos e redija uma minuta personalizada para este caso.
              </p>
              <button 
                onClick={handleGenerate}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all active:scale-95"
              >
                <Sparkles size={20} className="text-yellow-300" />
                Gerar Minuta com IA
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white sticky top-0 z-10">
                <button 
                  onClick={() => setMode('edit')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    mode === 'edit' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <Edit3 size={16} />
                  Editar
                </button>
                <button 
                  onClick={() => setMode('preview')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    mode === 'preview' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <Eye size={16} />
                  Prévia
                </button>
                <div className="ml-auto flex items-center gap-3">
                   {isGenerating && <span className="text-[10px] text-gray-400 animate-pulse font-black uppercase tracking-tighter">Gerando nova versão...</span>}
                   <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
                    title="Regerar com IA"
                  >
                    <History size={20} className={cn(isGenerating && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* Editor/Preview Container */}
              <div className="flex-1 overflow-auto p-8 bg-gray-50/30">
                <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-100 rounded-3xl min-h-full">
                  {mode === 'edit' ? (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full min-h-[600px] p-10 text-gray-800 font-mono text-sm border-0 focus:ring-0 resize-none leading-relaxed tracking-tight"
                      placeholder="Cole ou edite a minuta aqui..."
                    />
                  ) : (
                    <div 
                      className="p-10 prose prose-sm max-w-none prose-slate prose-headings:font-serif prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
                      dangerouslySetInnerHTML={{ __html: draft }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {draft && (
          <div className="p-8 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 bg-amber-50 px-4 py-3 rounded-2xl border border-amber-100 max-w-md">
              <AlertCheckIcon size={20} className="text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-900 font-bold uppercase leading-tight tracking-tight">
                Revise atentamente o texto gerado pela IA. A redação final é de responsabilidade do procurador.
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <button 
                onClick={handleSave}
                disabled={isSaving || isFinalizing}
                className="w-full md:w-auto bg-gray-100 text-gray-700 px-6 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Rascunhar
              </button>

              <button 
                onClick={handleFinalizeAndSign}
                disabled={isSaving || isFinalizing}
                className="w-full md:w-auto bg-green-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {isFinalizing ? <Loader2 className="animate-spin" size={20} /> : <FileCheck size={20} />}
                Finalizar e Assinar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function AlertCheckIcon({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
