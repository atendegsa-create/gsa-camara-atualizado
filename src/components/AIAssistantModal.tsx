// src/components/AIAssistantModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Process } from '../types';
import { Sparkles, X, FileText, Copy, CheckCircle, Download, Wand2 } from 'lucide-react';
import { generateDocumentWithTenantContext } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  processo: Process | null;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose, processo }) => {
  const { tenant } = useAuth();
  
  const [tipoDocumento, setTipoDocumento] = useState<'NOTIFICACAO' | 'CONTRATO' | 'TERMO' | 'ATA'>('NOTIFICACAO');
  const [instrucoes, setInstrucoes] = useState('');
  const [conteudoGerado, setConteudoGerado] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiado, setCopiado] = useState(false);

  if (!isOpen || !processo) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setConteudoGerado('');
    
    try {
      // Chama o nosso serviço que injeta o contexto da Unidade Credenciada
      const resultado = await generateDocumentWithTenantContext(
        tipoDocumento,
        processo,
        tenant,
        instrucoes
      );
      
      setConteudoGerado(resultado);
    } catch (error) {
      console.error("Erro ao gerar documento:", error);
      alert("Falha ao comunicar com a IA. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!conteudoGerado) return;
    const plainText = conteudoGerado.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 relative z-10"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="bg-primary p-6 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl tracking-tight">Assistente Jurídico IA</h2>
                  <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest">GSA AI Engine Premium</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* COLUNA ESQUERDA: CONFIGURAÇÃO DO PROMPT */}
              <div className="w-full md:w-80 bg-gray-50 border-r border-gray-100 p-8 flex flex-col gap-8 overflow-y-auto shrink-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <FileText size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Processo Alvo</span>
                  </div>
                  <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-1">
                    <p className="font-mono text-xs font-black text-primary">{processo.nup || 'SEM NUP'}</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{processo.cliente_nome}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Documento</label>
                  <select 
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value as any)}
                    className="w-full bg-white px-4 py-3 border-2 border-transparent focus:border-primary rounded-xl outline-none text-sm font-bold shadow-sm transition-all"
                  >
                    <option value="NOTIFICACAO">Notificação Extrajudicial</option>
                    <option value="TERMO">Termo de Acordo</option>
                    <option value="CONTRATO">Contrato de Honorários</option>
                    <option value="ATA">Ata de Audiência</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Diretrizes da IA</label>
                  <textarea 
                    value={instrucoes}
                    onChange={(e) => setInstrucoes(e.target.value)}
                    placeholder="Ex: Enfatizar o prazo de 48h para resposta..."
                    className="w-full bg-white px-4 py-3 border-2 border-transparent focus:border-primary rounded-xl outline-none text-sm font-medium h-40 resize-none shadow-sm transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="mt-auto space-y-4 pt-4 border-t border-gray-100">
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 group"
                  >
                    {isGenerating ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" /> 
                        Redigir Documento
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-300 font-bold text-center leading-relaxed">
                    Personalizado para:<br/>
                    <span className="text-gray-400">{tenant?.nome_unidade || 'GSA Master'}</span>
                  </p>
                </div>
              </div>

              {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO DO DOCUMENTO */}
              <div className="flex-1 bg-[#fcfbf9] p-8 flex flex-col items-center overflow-y-auto scrollbar-hide relative group/preview">
                {conteudoGerado ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl bg-white shadow-2xl shadow-black/5 p-12 md:p-16 min-h-[900px] text-sm text-gray-900 leading-relaxed font-serif relative rounded-xl border border-gray-50"
                  >
                    
                    {/* Ações do Documento */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                      <button 
                        onClick={handleCopy}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 h-10"
                      >
                        {copiado ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                      <button className="px-4 py-2 bg-primary text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 border border-primary h-10">
                        <Download size={14} /> PDF
                      </button>
                    </div>

                    {/* Conteúdo Gerado */}
                    <div 
                      className="mt-8 prose prose-slate prose-sm max-w-none prose-headings:font-serif prose-headings:font-black prose-p:leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: conteudoGerado }} 
                    />
                    
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-6">
                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-black/5 flex items-center justify-center animate-bounce">
                      <FileText size={40} className="text-gray-100" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-gray-900 font-serif font-black text-xl italic">Aguardando seu comando</p>
                      <p className="text-gray-400 text-sm max-w-xs mx-auto font-medium">
                        Configure as diretrizes à esquerda para que a nossa IA redija um documento jurídico impecável.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
