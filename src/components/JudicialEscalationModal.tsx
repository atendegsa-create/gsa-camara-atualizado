import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Process, UserProfile, Tenant } from '../types';
import { X, Scale, FileText, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { generateJudicialDossier } from '../services/legalDossierService';

interface JudicialEscalationModalProps {
  process: Process;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const JudicialEscalationModal: React.FC<JudicialEscalationModalProps> = ({ process, tenant, onClose, onSuccess }) => {
  const [advogados, setAdvogados] = useState<UserProfile[]>([]);
  const [selectedAdvogado, setSelectedAdvogado] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    fetchAdvogados();
  }, []);

  const fetchAdvogados = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('tipo_usuario', '==', 'ADVOGADO'));
      const snap = await getDocs(q);
      const advs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setAdvogados(advs);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'usuarios');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAdvogado) return alert("Selecione um advogado");
    
    setLoading(true);
    try {
      // Create Dossier e Petition text via service (could take a while)
      const { dossieUrl, peticaoUrl } = await generateJudicialDossier(process.id, process, tenant);

      // Atualiza Processo
      const ref = doc(db, 'processos', process.id);
      await updateDoc(ref, {
        status: 'JUDICIAL_AGUARDANDO_PETICAO',
        tipoJustica: 'judicial',
        advogado_id: selectedAdvogado,
        notas_procurador: notas,
        dossie_provas_url: dossieUrl,
        peticao_inicial_url: peticaoUrl,
        ultima_atualizacao: new Date()
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao encaminhar processo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const judicialTaxa = tenant?.regrasComissao?.judicialTaxa || tenant?.financeiro?.comissaoJudicial || 15;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <Scale size={24} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-900">Encaminhamento Judicial</h2>
            <p className="text-gray-500 font-medium text-sm mt-1">
              Iniciando litígio para o NUP <strong className="text-gray-900">{process.nup}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-3 text-gray-400 hover:bg-gray-100 rounded-full transition-colors self-start">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-start gap-4">
            <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
            <div>
              <h4 className="text-red-800 font-bold text-sm mb-1">Ação Judicial Restrita</h4>
              <p className="text-red-700/80 text-xs font-medium leading-relaxed">
                Esta ação encerra a fase de mediação extrajudicial. O sistema vai gerar automaticamente um <b>Dossiê de Provas em PDF</b> contendo o tracking do AR Online (se houver), ofertas Blind Bidding registradas, e um <b>Rascunho da Petição Inicial</b> estruturado pela IA.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">Selecione o Advogado Responsável</label>
              {loadingInitial ? (
                <div className="h-14 bg-gray-50 animate-pulse rounded-2xl" />
              ) : (
                <select 
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-700 appearance-none cursor-pointer"
                  value={selectedAdvogado}
                  onChange={(e) => setSelectedAdvogado(e.target.value)}
                >
                  <option value="">Selecione um profissional...</option>
                  {advogados.map(adv => (
                    <option key={adv.id} value={adv.id}>{adv.nome_completo} ({adv.email})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">Notas / Instruções do Procurador</label>
              <textarea 
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-700 min-h-[120px] resize-y"
                placeholder="Existem provas específicas relevantes para o tribunal? Algum documento adicional pendente?"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-50">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500" />
              Impacto no Comissionamento Geral
            </h4>
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-indigo-800">Honorário Judicial (GSA Master):</span>
              <span className="text-indigo-900 font-bold">{judicialTaxa}%</span>
            </div>
            <p className="text-[10px] text-indigo-500 mt-2 font-medium">O motor financeiro aplicará automaticamente a taxa informada no sucesso da causa após a prolação da sentença.</p>
          </div>

        </div>

        <div className="p-8 border-t border-gray-50 flex justify-end gap-3 bg-white">
          <button 
            disabled={loading}
            onClick={onClose} 
            className="px-6 py-4 font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            disabled={loading || !selectedAdvogado}
            onClick={handleConfirm}
            className="px-8 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 flex items-center justify-center min-w-[200px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Encaminhamento"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
