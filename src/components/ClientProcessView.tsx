import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileText, 
  Scale, 
  MessageSquare, 
  Download,
  ShieldCheck,
  ChevronLeft,
  History,
  Video,
  PenTool,
  ExternalLink,
  Upload,
  AlertCircle,
  Loader2,
  FileLock2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ProcessStatus, ProcessLog, Document } from '../types';
import { VideoAudiencia } from './VideoAudiencia';
import { auth, db, getFirebaseStorage, ref, uploadBytes, getDownloadURL } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion, collection, onSnapshot, addDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { generateFileHash, formatHash } from '../lib/hashUtils';
import ClientPortalNegotiation from './ClientPortalNegotiation';
import { useAuth } from '../AuthContext';

interface PhaseStep {
  id: ProcessStatus;
  label: string;
  description: string;
}

const PHASES: PhaseStep[] = [
  { id: 'TRIAGEM', label: 'Início', description: 'Auditoria e Triagem' },
  { id: 'NOTIFICACAO', label: 'Notificação', description: 'Citação da Parte Contrária' },
  { id: 'AUDIENCIA', label: 'Audiência', description: 'Sessão de Conciliação' },
  { id: 'ACORDO', label: 'Acordo', description: 'Homologação e Encerramento' }
];

import { IntegritySeal } from './IntegritySeal';

interface ClientProcessViewProps {
  process: {
    id: string;
    nup: string;
    tipo_acao: string;
    status: ProcessStatus;
    data_abertura: any;
    logs?: ProcessLog[];
    link_assinatura?: string;
    status_assinatura?: string;
    laudo_tecnico?: string;
    funnel_data?: any;
    tenantId?: string;
    termoAcordoHash?: string;
    termoAcordoUrl?: string;
  };
  onBack?: () => void;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

export function ClientProcessView({ process, onBack, onGenerateReport, isGeneratingReport }: ClientProcessViewProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.id) return;

    // Escuta documentos em tempo real
    const q = query(
      collection(db, 'processos', process.id, 'documentos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Document));
      setDocuments(docs);
    });

    return () => unsubscribe();
  }, [process.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !process.id) return;

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Gerar Hash SHA-256 Localmente
      const hash = await generateFileHash(file);
      const timestampSeguro = new Date().toISOString();

      // 2. Upload para Storage
      const storage = getFirebaseStorage();
      if (!storage) throw new Error("Serviço de Armazenamento não disponível.");
      
      const storageRef = ref(storage, `processos/${process.id}/documentos/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // 3. Salvar no Firestore com Metadados de Integridade
      await addDoc(collection(db, 'processos', process.id, 'documentos'), {
        tenantId: process.tenantId || null,
        processo_id: process.id,
        titulo: file.name,
        tipo_documento: 'OUTROS',
        url_storage: downloadUrl,
        gerado_por_ia: false,
        status_assinatura: 'PENDENTE',
        hash_integridade: hash,
        timestamp_seguro: timestampSeguro,
        createdAt: serverTimestamp()
      });

      // 4. Log no Processo
      await updateDoc(doc(db, 'processos', process.id), {
        logs: arrayUnion({
          status: process.status,
          mensagem: `Documento "${file.name}" anexado com selo de integridade SHA-256.`,
          data: new Date().toISOString()
        }),
        ultima_atualizacao: serverTimestamp()
      });

    } catch (err: any) {
      console.error("Erro no upload:", err);
      setUploadError("Falha ao processar evidência. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent(`Olá, suporte GSA! Preciso de ajuda com meu processo NUP: ${process.nup}`);
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  const handleSimulatePayment = async () => {
    if (!process.id) return;
    navigate(`/checkout-simulado?processoId=${process.id}&valor=250.00`);
  };

  const currentPhaseIndex = PHASES.findIndex(p => p.id === process.status);
  const displayIndex = currentPhaseIndex === -1 ? 0 : currentPhaseIndex;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Acompanhamento do Processo</h1>
          <p className="text-sm text-gray-500">NUP: {process.nup}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-8 mb-8 overflow-x-auto">
        <div className="relative flex justify-between min-w-[300px] md:min-w-0">
          <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0" />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(displayIndex / (PHASES.length - 1)) * 100}%` }}
            className="absolute top-5 left-0 h-0.5 bg-[#5A5A40] -z-0"
          />

          {PHASES.map((phase, index) => {
            const isCompleted = index < displayIndex;
            const isActive = index === displayIndex;
            
            return (
              <div key={phase.id} className="relative z-10 flex flex-col items-center text-center px-2">
                <motion.div 
                  initial={false}
                  animate={{
                    scale: isActive ? 1.2 : 1,
                    backgroundColor: isCompleted || isActive ? '#5A5A40' : '#fff',
                    borderColor: isCompleted || isActive ? '#5A5A40' : '#e5e7eb'
                  }}
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center transition-colors",
                    isActive && "ring-4 ring-[#5A5A40]/10"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} className="text-white" />
                  ) : isActive ? (
                    <Clock size={18} className="text-white animate-pulse" />
                  ) : (
                    <Circle size={18} className="text-gray-300" />
                  )}
                </motion.div>
                <div className="mt-4">
                  <p className={cn(
                    "text-[10px] md:text-sm font-bold",
                    isActive ? "text-[#5A5A40]" : isCompleted ? "text-gray-900" : "text-gray-400"
                  )}>
                    {phase.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-tight hidden md:block">
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-gray-900">
            <h3 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
              <ShieldCheck className="text-green-600" size={24} />
              Status Atual
            </h3>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-gray-700 leading-relaxed">
                {process.status === 'TRIAGEM' && "Sua documentação está sendo auditada por nossa equipe jurídica. Em breve você receberá o link para pagamento da TAP."}
                {process.status === 'AGUARDANDO_TAP' && "Auditoria concluída! Por favor, realize o pagamento da Taxa Administrativa (TAP) para prosseguirmos com a citação."}
                {process.status === 'NOTIFICACAO' && "A parte contrária foi notificada. Aguardamos a confirmação de recebimento para agendar a audiência."}
                {process.status === 'AUDIENCIA' && "Sua audiência de conciliação foi agendada. Clique no botão ao lado para entrar na sala virtual no horário marcado."}
                {process.status === 'ACORDO' && "Parabéns! O acordo foi firmado e está em fase de homologação final."}
                {process.status === 'ENCERRADO' && "Processo encerrado com sucesso."}
                {process.status === 'JUDICIAL' && "O processo foi encaminhado para a esfera judicial."}
              </p>
            </div>
            
            {/* NOVO: Negociação Assíncrona (Blind Bidding) */}
            <div className="mt-8">
              <ClientPortalNegotiation 
                processo={process as any} 
                role={profile?.tipo_usuario === 'REQUERIDO' ? 'requerido' : 'requerente'}
                onUpdate={() => {
                  // Pode-se disparar um refresh ou apenas deixar o componente gerir
                }}
              />
            </div>
            
            {process.status === 'AUDIENCIA' && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Video size={18} className="text-[#5A5A40]" />
                    Sala de Audiência Virtual
                  </p>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Ao Vivo</span>
                </div>
                <VideoAudiencia 
                  processo={process as any} 
                  tenant={null} // Or pass tenant if available context
                  userName={auth.currentUser?.displayName || "Cliente GSA"} 
                  isMediator={false}
                />
                <p className="text-[10px] text-gray-400 text-center">
                  Ao entrar, você concorda com os termos de confidencialidade da Lei 13.140/2015.
                </p>
              </div>
            )}

            {process.link_assinatura && (
              <div className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <PenTool className="text-green-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-green-900">Documento Pendente de Assinatura</p>
                    <p className="text-xs text-green-600">O acordo extrajudicial aguarda sua assinatura digital.</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.open(process.link_assinatura, '_blank')}
                  className="w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  Assinar Agora
                  <ExternalLink size={16} />
                </button>
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-gray-900">
            <h3 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
              <History className="text-[#5A5A40]" size={24} />
              Histórico do Processo
            </h3>
            <div className="space-y-4">
              {process.logs?.slice().reverse().map((log, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-px bg-gray-100 relative">
                    <div className="absolute top-2 -left-1 w-2 h-2 rounded-full bg-[#5A5A40]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-[#5A5A40] uppercase">{log.status.replace('_', ' ')}</span>
                      <span className="text-[10px] text-gray-400">{new Date(log.data).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.mensagem}</p>
                  </div>
                </div>
              ))}
              {(!process.logs || process.logs.length === 0) && (
                <p className="text-sm text-gray-400 italic">O histórico será atualizado conforme o processo avançar.</p>
              )}
            </div>
          </section>

          {/* Cofre de Evidências Section */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-gray-900">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif font-bold text-xl flex items-center gap-2">
                <FileLock2 className="text-brand-primary" size={24} />
                Cofre de Evidências
              </h3>
              
              <div className="relative">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label 
                  htmlFor="file-upload"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
                  Anexar Prova
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                {uploadError}
              </div>
            )}

            <div className="space-y-4">
              {process.termoAcordoHash && (
                <div className="mb-6">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3">Termo de Acordo Final</p>
                  <IntegritySeal 
                    processId={process.id}
                    storedHash={process.termoAcordoHash}
                    fileUrl={process.termoAcordoUrl || ''}
                    fileName="Termo_Acordo_Final.pdf"
                    processData={process}
                  />
                </div>
              )}

              {documents.length === 0 && !process.termoAcordoHash ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-50 rounded-[2rem]">
                  <FileText className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma evidência anexada ainda.</p>
                </div>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="group bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 p-5 rounded-[2rem] transition-all flex flex-col gap-4 shadow-sm hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-400">
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{doc.titulo}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            {doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleString() : 'Recentemente'}
                          </p>
                        </div>
                      </div>
                      <a 
                        href={doc.url_storage} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-3 text-brand-primary hover:bg-brand-primary hover:text-white rounded-2xl transition-all"
                      >
                        <Download size={20} />
                      </a>
                    </div>

                    {doc.hash_integridade && (
                      <IntegritySeal 
                        processId={process.id}
                        storedHash={doc.hash_integridade}
                        fileUrl={doc.url_storage}
                        fileName={doc.titulo}
                        processData={process}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-[#5A5A40] rounded-3xl p-6 text-white shadow-lg">
            <MessageSquare className="mb-4" size={32} />
            <h4 className="font-bold text-lg mb-2">Precisa de ajuda?</h4>
            <p className="text-sm text-white/80 mb-6">Fale agora com seu conciliador responsável via WhatsApp.</p>
            <button 
              onClick={handleWhatsAppSupport}
              className="w-full bg-white text-[#5A5A40] py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              Suporte GSA
            </button>
          </div>

          {process.status === 'AGUARDANDO_TAP' && (
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 shadow-sm">
              <Clock className="text-amber-600 mb-4" size={32} />
              <h4 className="font-bold text-amber-900 text-lg mb-2">Pagamento Pendente</h4>
              <p className="text-sm text-amber-700 mb-6">Realize o pagamento da TAP para iniciar a notificação do banco.</p>
              <button 
                onClick={handleSimulatePayment}
                className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-md"
              >
                Pagar TAP (Checkout)
              </button>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 shadow-sm text-gray-900">
            <ShieldCheck className="text-blue-600 mb-4" size={32} />
            <h4 className="font-bold text-blue-900 text-lg mb-2">Laudo Técnico Pericial</h4>
            <p className="text-sm text-blue-700 mb-6">
              {process.laudo_tecnico 
                ? "Seu laudo técnico detalhado já está disponível para visualização." 
                : "Obtenha o laudo técnico completo analisado por nossa IA pericial."}
            </p>
            <button 
              onClick={onGenerateReport}
              disabled={isGeneratingReport}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText size={20} />
              )}
              {process.laudo_tecnico ? "Ver Laudo Técnico" : "Gerar Laudo Técnico (R$ 47)"}
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-gray-900">
            <h4 className="font-bold text-gray-900 mb-4">Detalhes da Câmara</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Scale size={18} className="text-gray-400" />
                <span className="text-xs text-gray-600">Câmara GSA - Unidade SP</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gray-400" />
                <span className="text-xs text-gray-600">Atendimento: 09h às 18h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

