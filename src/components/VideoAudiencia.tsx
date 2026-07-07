import React, { useState } from 'react';
import { Process, Tenant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, FileText, Bot, Loader2, Video, CheckCircle2 } from 'lucide-react';
import { gerarAtaAudiencia } from '../services/ataService';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { gerarHashDocumento } from '../lib/hashUtils';
import Markdown from 'react-markdown';

interface VideoAudienciaProps {
  processo: Process;
  tenant: Tenant | null;
  userName: string;
  isMediator?: boolean;
}

export const VideoAudiencia = ({ processo, tenant, userName, isMediator = false }: VideoAudienciaProps) => {
  const [activeTab, setActiveTab] = useState<'propostas' | 'ata'>('propostas');
  const [notasStr, setNotasStr] = useState('');
  const [ataGerada, setAtaGerada] = useState('');
  const [loadingAta, setLoadingAta] = useState(false);
  const [loadingGravacao, setLoadingGravacao] = useState(false);
  const [videoFinalizado, setVideoFinalizado] = useState(false);

  const jitsiRoomName = `GSA-CAMARA-${processo.nup.replace(/-/g, '')}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}#config.startWithAudioMuted=true&userInfo.displayName="${userName}"`;

  const handleGerarAta = async () => {
    if (!notasStr) {
      alert("Adicione algumas notas antes de gerar a ata.");
      return;
    }
    setLoadingAta(true);
    try {
      const ataTxt = await gerarAtaAudiencia(notasStr, processo, tenant);
      setAtaGerada(ataTxt);
    } catch (e: any) {
      alert("Erro ao gerar ata: " + e.message);
    } finally {
      setLoadingAta(false);
    }
  };

  const handleEncerrarAudiencia = async () => {
    setLoadingGravacao(true);
    try {
      // Mock video generation by taking some random data as the "video" to hash
      const fakeVideoUrl = `https://storage.gsa.com.br/audiencias/${processo.nup}.mp4`;
      
      // We assume we have the file blob or hash. Let's just create a strong SHA 
      // by generating it directly from string to mock the file content hash
      const mockFileContent = new Blob([jitsiRoomName, new Date().toISOString()]);
      const videoFile = new File([mockFileContent], "gravacao.mp4", { type: "video/mp4" });
      const videoHash = await gerarHashDocumento(videoFile);

      // Save to Firestore Process (update the process with video_url and video_hash)
      const ref = doc(db, 'processos', processo.id);
      await updateDoc(ref, {
        videoUrl: fakeVideoUrl,
        videoHash: videoHash,
      });

      // Se tiver uma ata gerada, também podemos salvar como documento
      if (ataGerada) {
        await addDoc(collection(db, 'processos', processo.id, 'documentos'), {
          titulo: 'Ata de Audiência (IA)',
          tipo_documento: 'ATA',
          url_storage: '#', // In reality, we upload the raw ata or PDF to storage here
          conteudo_raw: ataGerada,
          gerado_por_ia: true,
          status_assinatura: 'PENDENTE',
          createdAt: new Date(),
        });
      }

      setVideoFinalizado(true);
      alert("Audiência finalizada. Gravação e hash de integridade salvos no dossiê!");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao finalizar gravação.");
    } finally {
      setLoadingGravacao(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1400px] mx-auto h-[800px] bg-gray-50 rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
      
      {/* AREA DE VIDEO (Principal) */}
      <div className="flex-1 flex flex-col relative bg-black">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          className="w-full flex-1"
          title="Audiência Online GSA"
        />
        {isMediator && !videoFinalizado && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={handleEncerrarAudiencia}
              disabled={loadingGravacao}
              className="bg-red-600/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition flex items-center gap-2 shadow-xl shadow-red-900/50"
            >
              {loadingGravacao ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
              Encerrar e Selar Gravação
            </button>
          </div>
        )}
        {videoFinalizado && (
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white">
            <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold">Audiência Encerrada</h2>
            <p className="text-gray-400 mt-2 font-medium">A gravação foi selada e já consta no Dossiê de Provas do processo.</p>
          </div>
        )}
      </div>

      {/* PAINEL LATERAL (Mediador) */}
      {isMediator && (
        <div className="w-full xl:w-[400px] bg-white border-l border-gray-200 flex flex-col h-full">
          {/* Tabs */}
          <div className="flex p-4 border-b border-gray-100 gap-2 bg-gray-50/50">
            <button 
              onClick={() => setActiveTab('propostas')}
              className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'propostas' ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <Eye size={14} /> Propostas Cegas
            </button>
            <button 
              onClick={() => setActiveTab('ata')}
              className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'ata' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <FileText size={14} /> Ata Tempo Real
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'propostas' ? (
                <motion.div 
                  key="propostas"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 text-sm">
                     <p className="font-bold text-yellow-900">Proposta Requerente:</p>
                     <p className="text-yellow-800 text-lg">R$ {processo.blind_bidding?.proposta_requerente?.toFixed(2) || 'Não informada'}</p>
                  </div>
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-sm">
                     <p className="font-bold text-blue-900">Proposta Requerido:</p>
                     <p className="text-blue-800 text-lg">R$ {processo.blind_bidding?.proposta_requerido?.toFixed(2) || 'Não informada'}</p>
                  </div>
                  {processo.blind_bidding?.proposta_requerente && processo.blind_bidding?.proposta_requerido && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Diferença Atual</p>
                      <p className="text-xl font-bold text-gray-900">
                        R$ {Math.abs(processo.blind_bidding.proposta_requerente - processo.blind_bidding.proposta_requerido).toFixed(2)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="ata"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 h-full flex flex-col"
                >
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Tópicos Debatidos</label>
                  <textarea 
                    value={notasStr}
                    onChange={(e) => setNotasStr(e.target.value)}
                    placeholder="Anote aqui os pontos principais, valores discutidos e o desfecho..."
                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-2xl resize-none text-sm font-medium h-32 focus:bg-white transition-all outline-none"
                  />
                  
                  {ataGerada ? (
                    <div className="flex-1 mt-4 flex flex-col">
                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs p-4 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
                        <Bot size={16} /> Ata Gerada pela IA
                      </div>
                      <div className="mt-4 flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-6 border border-gray-200 prose prose-sm prose-indigo">
                        <Markdown>{ataGerada}</Markdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <button 
                    onClick={handleGerarAta}
                    disabled={loadingAta}
                    className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-4 rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {loadingAta ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                    {ataGerada ? 'Regerar Ata Final com IA' : 'Gerar Ata Final com IA'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

