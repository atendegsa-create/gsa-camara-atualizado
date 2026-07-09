import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sparkles, Keyboard, FileText, UploadCloud, Eye, ExternalLink, ShieldCheck, ArrowRight, ChevronLeft, Scale, Gavel } from 'lucide-react';
import { gerarHashDocumento } from '../lib/hashUtils';
import { validateDocumentIa } from '../services/geminiService';
import { createProcess } from '../lib/db';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProcessStatus } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface NovoProcessoForm {
  cliente_nome: string;
  cliente_documento: string;
  valor_causa: number;
  resumo_fato: string;
  cliente_email?: string;
  cliente_whatsapp?: string;
  parte_contraria_nome?: string;
  parte_contraria_telefone?: string;
}

export default function NovaInclusaoProcesso() {
  const [modoInclusao, setModoInclusao] = useState<'inteligente' | 'manual'>('inteligente');
  const [tipoJustica, setTipoJustica] = useState<'extrajudicial' | 'judicial' | null>(null);
  const navigate = useNavigate();

  if (!tipoJustica) {
    return (
      <div className="w-full min-h-screen bg-slate-900 text-white p-6 md:p-8 flex items-center justify-center">
        <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Novo Protocolo GSA
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
              Selecione o rito ideal para dar início ao processo ou mediação do seu cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* CARD EXTRAJUDICIAL */}
            <button
              id="btn-selecionar-extrajudicial"
              onClick={() => setTipoJustica('extrajudicial')}
              className="group bg-slate-800/40 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/85 p-8 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 transform hover:-translate-y-1 flex flex-col justify-between min-h-[250px]"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                  <Scale size={28} />
                </div>
                <h3 className="font-bold text-xl text-white mb-2">Procedimento Extrajudicial</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Inicie mediação, conciliação consensual ou rito de acordo amigável com força de título executivo extrajudicial.
                </p>
              </div>
              <span className="text-amber-500 font-bold text-sm inline-flex items-center gap-2 mt-6">
                Iniciar Extrajudicial <ArrowRight size={16} />
              </span>
            </button>

            {/* CARD JUDICIAL */}
            <button
              id="btn-selecionar-judicial"
              onClick={() => setTipoJustica('judicial')}
              className="group bg-slate-800/40 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/85 p-8 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 transform hover:-translate-y-1 flex flex-col justify-between min-h-[250px]"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <Gavel size={28} />
                </div>
                <h3 className="font-bold text-xl text-white mb-2">Procedimento Judicial</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Encaminhe a petição inicial ou dossier de provas para distribuição em juízo cível, revisional ou indenizatório.
                </p>
              </div>
              <span className="text-blue-400 font-bold text-sm inline-flex items-center gap-2 mt-6">
                Iniciar Judicial <ArrowRight size={16} />
              </span>
            </button>
          </div>

          <div className="text-center pt-4">
            <button
              id="btn-voltar-painel"
              onClick={() => navigate('..', { relative: 'path' })}
              className="text-slate-500 hover:text-slate-300 text-sm font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} /> Voltar ao Painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO E SELETOR DE ABAS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-4">
            <button 
              id="btn-voltar-rito"
              onClick={() => setTipoJustica(null)}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300"
              title="Voltar para seleção de rito"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold">
                  {tipoJustica === 'extrajudicial' ? 'Novo Processo Extrajudicial' : 'Novo Processo Judicial'}
                </h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  tipoJustica === 'judicial' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {tipoJustica === 'judicial' ? 'Rito Judicial' : 'Rito Extrajudicial'}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {tipoJustica === 'extrajudicial' 
                  ? 'Inicie um novo procedimento de mediação extrajudicial.' 
                  : 'Inicie um novo ajuizamento ou procedimento judicial cível.'}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm w-fit">
            <button
              id="btn-modo-inteligente"
              onClick={() => setModoInclusao('inteligente')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                modoInclusao === 'inteligente' 
                  ? (tipoJustica === 'judicial' ? 'bg-blue-600 text-white shadow-md' : 'bg-amber-500 text-slate-950 shadow-md')
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Leitura Inteligente (IA)
            </button>
            <button
              id="btn-modo-manual"
              onClick={() => setModoInclusao('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                modoInclusao === 'manual' 
                  ? 'bg-slate-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Preenchimento Manual
            </button>
          </div>
        </div>

        {/* RENDERIZAÇÃO CONDICIONAL BASEADA NA ABA SELECIONADA */}
        {modoInclusao === 'inteligente' ? (
          <FormularioInteligente tipoJustica={tipoJustica} />
        ) : (
          <FormularioManual tipoJustica={tipoJustica} />
        )}

      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE 1: INCLUSÃO INTELIGENTE (SPLIT-SCREEN)
// ============================================================================
function FormularioInteligente({ tipoJustica }: { tipoJustica: 'extrajudicial' | 'judicial' }) {
  const { register, setValue, handleSubmit } = useForm<NovoProcessoForm>();
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);
    setFileType(file.type);

    // Gerar Hash SHA-256
    const hash = await gerarHashDocumento(file);
    setFileHash(hash);

    // Extração IA
    setLoadingAI(true);
    
    const readFile = async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const dataUrl = e.target.result as string;
            resolve(dataUrl.split(',')[1]);
          } else {
            reject("Erro ao ler arquivo");
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    };

    try {
      const base64Str = await readFile(file);
      const analiseIA = await validateDocumentIa(null, { nome: '', cpf: '', morada: '' }, {
        documentBase64: base64Str,
        mimeType: file.type
      });
      if (analiseIA) {
        if (analiseIA.nome) setValue('cliente_nome', analiseIA.nome);
        if (analiseIA.cpf) setValue('cliente_documento', analiseIA.cpf);
        if (analiseIA.valor_total) setValue('valor_causa', analiseIA.valor_total);
      }
    } catch (err) {
      console.error("Erro na leitura IA interna:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  const onSubmit = async (data: NovoProcessoForm) => {
    if (!profile) return;
    try {
      const nup = `GSA-${new Date().getFullYear()}${new Date().getMonth() + 1}-${Math.floor(1000 + Math.random() * 9000)}`;

      const docId = await createProcess({
        nup,
        status: 'TRIAGEM' as ProcessStatus,
        tipo_acao: 'Documento Digitalizado',
        cliente_nome: data.cliente_nome,
        cliente_documento: data.cliente_documento,
        valor_estimado_recuperacao: Number(data.valor_causa) || 0,
        resumo_fato: data.resumo_fato,
        criado_por: auth.currentUser?.uid,
        cliente_id: auth.currentUser?.uid,
        documento_hash: fileHash,
        tipoJustica: tipoJustica,
        logs: [
          { 
            status: 'TRIAGEM', 
            mensagem: `Processo avulso criado via painel inteligente (${tipoJustica === 'judicial' ? 'Judicial' : 'Extrajudicial'}).`, 
            data: new Date().toISOString() 
          }
        ]
      }, profile);

      await setDoc(doc(db, "consulta_publica", nup), {
        nup,
        status: 'TRIAGEM' as ProcessStatus,
        tipo_acao: 'Documento Digitalizado',
        cliente_documento: data.cliente_documento || 'ND',
        tipoJustica: tipoJustica,
        criado_em: serverTimestamp(),
        logs: [
          { status: 'TRIAGEM', data: new Date().toISOString() }
        ]
      });

      alert(`Processo criado com sucesso! NUP: ${nup}`);
      const processPath = window.location.pathname.replace(/\/novo\/?$/, `/${docId}`);
      navigate(processPath);

    } catch (error) {
      console.error("Erro ao criar processo:", error);
      alert("Houve um erro ao incluir o processo inteligente.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Esquerda: Formulário e Upload */}
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl space-y-4">
        <div className={`border-2 border-dashed border-slate-600 rounded-xl p-6 transition text-center cursor-pointer relative bg-slate-900/40 group ${
          tipoJustica === 'judicial' ? 'hover:border-blue-400' : 'hover:border-amber-400'
        }`}>
          <input type="file" accept=".pdf,image/*" onChange={handleDocumentUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 bg-slate-800 rounded-full transition-colors ${
              tipoJustica === 'judicial' ? 'group-hover:bg-blue-500/20' : 'group-hover:bg-amber-500/20'
            }`}>
              <UploadCloud className={`w-8 h-8 text-slate-400 transition-colors ${
                tipoJustica === 'judicial' ? 'group-hover:text-blue-400' : 'group-hover:text-amber-400'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Arraste a Petição Inicial ou Contrato</p>
              <p className="text-xs text-slate-500 mt-1">A IA do Gemini extrairá os dados automaticamente</p>
            </div>
          </div>
        </div>

        {loadingAI && (
          <div className={`text-xs flex items-center gap-2 p-3 rounded-lg border ${
            tipoJustica === 'judicial' 
              ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          }`}>
            <span className="animate-spin">🔄</span> Lendo documento e preenchendo campos...
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Requerente (Nome)</label>
              <input {...register('cliente_nome')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 transition-all ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400 focus:ring-blue-400' : 'focus:border-amber-400 focus:ring-amber-400'
              }`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">CPF / CNPJ</label>
              <input {...register('cliente_documento')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 transition-all ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400 focus:ring-blue-400' : 'focus:border-amber-400 focus:ring-amber-400'
              }`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400"> Valor da Causa / Dívida (R$)</label>
            <input type="number" step="0.01" {...register('valor_causa')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 transition-all ${
              tipoJustica === 'judicial' ? 'focus:border-blue-400 focus:ring-blue-400' : 'focus:border-amber-400 focus:ring-amber-400'
            }`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400">Resumo dos Fatos</label>
            <textarea {...register('resumo_fato')} rows={3} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 transition-all ${
              tipoJustica === 'judicial' ? 'focus:border-blue-400 focus:ring-blue-400' : 'focus:border-amber-400 focus:ring-amber-400'
            }`} placeholder={tipoJustica === 'judicial' ? 'Revise ou complete o resumo da petição judicial...' : 'Revise ou complete o resumo da mediação extrajudicial...'} />
          </div>

          {fileHash && (
             <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-xs text-emerald-400">
               <ShieldCheck className="w-4 h-4 shrink-0" />
               <span className="truncate">Cofre de Evidências (SHA-256): {fileHash}</span>
             </div>
          )}

          <button type="submit" className={`w-full flex justify-center items-center gap-2 font-bold p-3 rounded-lg transition-colors text-sm ${
            tipoJustica === 'judicial' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
          }`}>
            Protocolar com Evidência <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Direita: Visualizador Embutido */}
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Pré-visualização do Documento
          </h3>
          {filePreviewUrl && (
            <a href={filePreviewUrl} target="_blank" rel="noreferrer" className={`text-xs flex items-center gap-1 bg-slate-900/50 px-3 py-1.5 rounded-lg border transition-all ${
              tipoJustica === 'judicial' 
                ? 'text-blue-400 hover:text-blue-300 border-slate-700 hover:border-blue-500/30' 
                : 'text-amber-400 hover:text-amber-300 border-slate-700 hover:border-amber-500/30'
            }`}>
              Abrir numa aba dedicada <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex-1 border border-slate-700 rounded-xl bg-slate-900/60 overflow-hidden flex items-center justify-center relative">
          {filePreviewUrl ? (
            fileType === 'application/pdf' ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <FileText className={`w-16 h-16 mb-2 ${tipoJustica === 'judicial' ? 'text-blue-500' : 'text-amber-500'}`} />
                <h4 className="text-lg font-bold text-slate-200">PDF Carregado e Analisado</h4>
                <p className="text-sm text-slate-400 max-w-[300px]">
                  A visualização embutida de PDFs pode ser bloqueada pelo navegador atual. Para ler o documento original, abra numa nova aba.
                </p>
                <a 
                  href={filePreviewUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className={`inline-flex items-center gap-2 border px-6 py-2.5 rounded-xl font-bold transition-colors mt-4 ${
                    tipoJustica === 'judicial' 
                      ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' 
                      : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Abrir PDF Original <ExternalLink size={16} />
                </a>
              </div>
            ) : fileType?.startsWith('image/') ? (
              <img src={filePreviewUrl} alt="Visualização" className="max-w-full max-h-full object-contain" />
            ) : (
              <iframe src={filePreviewUrl} title="Visualizador" className="w-full h-full bg-white" />
            )
          ) : (
            <div className="text-center text-slate-500 p-4 space-y-2">
              <Eye className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-sm">A aguardar documento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE 2: INCLUSÃO MANUAL (TRADICIONAL)
// ============================================================================
function FormularioManual({ tipoJustica }: { tipoJustica: 'extrajudicial' | 'judicial' }) {
  const { register, handleSubmit } = useForm<NovoProcessoForm>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: NovoProcessoForm) => {
    if (!profile) return;
    try {
      const nup = `GSA-${new Date().getFullYear()}${new Date().getMonth() + 1}-${Math.floor(1000 + Math.random() * 9000)}`;

      const docId = await createProcess({
        nup,
        status: 'TRIAGEM' as ProcessStatus,
        tipo_acao: 'Documento Digitalizado', // ou Inclusão Manual? 
        cliente_nome: data.cliente_nome || '',
        cliente_documento: data.cliente_documento || '',
        cliente_email: data.cliente_email || '',
        cliente_whatsapp: data.cliente_whatsapp || '',
        parte_contraria_nome: data.parte_contraria_nome || '',
        parte_contraria_telefone: data.parte_contraria_telefone || '',
        valor_causa: Number(data.valor_causa) || 0,
        valor_estimado_recuperacao: Number(data.valor_causa) || 0,
        resumo_fato: data.resumo_fato || '',
        criado_por: auth.currentUser?.uid,
        cliente_id: auth.currentUser?.uid,
        tipoJustica: tipoJustica,
        logs: [
          { 
            status: 'TRIAGEM', 
            mensagem: `Processo avulso criado via painel manual (${tipoJustica === 'judicial' ? 'Judicial' : 'Extrajudicial'}).`, 
            data: new Date().toISOString() 
          }
        ]
      }, profile);

      await setDoc(doc(db, "consulta_publica", nup), {
        nup,
        status: 'TRIAGEM' as ProcessStatus,
        tipo_acao: 'Documento Digitalizado',
        cliente_documento: data.cliente_documento || 'ND',
        tipoJustica: tipoJustica,
        criado_em: serverTimestamp(),
        logs: [
          { status: 'TRIAGEM', data: new Date().toISOString() }
        ]
      });

      alert(`Processo criado com sucesso! NUP: ${nup}`);
      const processPath = window.location.pathname.replace(/\/novo\/?$/, `/${docId}`);
      navigate(processPath);

    } catch (error) {
      console.error("Erro ao criar processo:", error);
      alert("Houve um erro ao incluir o processo manual.");
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 md:p-8 rounded-2xl shadow-xl max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Bloco Requerente */}
        <div>
          <h3 className={`text-sm font-semibold mb-3 border-b border-slate-700 pb-2 ${
            tipoJustica === 'judicial' ? 'text-blue-400' : 'text-amber-500'
          }`}>
            {tipoJustica === 'judicial' ? 'Dados do Autor (Requerente)' : 'Dados do Requerente'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Nome Completo / Razão Social</label>
              <input {...register('cliente_nome', { required: true })} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Documento (CPF/CNPJ)</label>
              <input {...register('cliente_documento')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">E-mail</label>
              <input type="email" {...register('cliente_email')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">WhatsApp</label>
              <input {...register('cliente_whatsapp')} placeholder="+55" className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
          </div>
        </div>

        {/* Bloco Requerido */}
        <div>
          <h3 className={`text-sm font-semibold mb-3 border-b border-slate-700 pb-2 ${
            tipoJustica === 'judicial' ? 'text-blue-400' : 'text-amber-500'
          }`}>
            {tipoJustica === 'judicial' ? 'Dados do Réu (Parte Contrária)' : 'Dados do Requerido (Parte Contrária)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Nome da Parte Contrária</label>
              <input {...register('parte_contraria_nome')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">WhatsApp do Requerido (Para Citação)</label>
              <input {...register('parte_contraria_telefone')} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
          </div>
        </div>

        {/* Bloco Resumo */}
        <div>
          <h3 className={`text-sm font-semibold mb-3 border-b border-slate-700 pb-2 ${
            tipoJustica === 'judicial' ? 'text-blue-400' : 'text-amber-500'
          }`}>
            {tipoJustica === 'judicial' ? 'Detalhes da Causa Judicial' : 'Detalhes da Mediação'}
          </h3>
          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="text-xs font-semibold text-slate-400">Valor da Causa / Dívida (R$)</label>
              <input type="number" step="0.01" {...register('valor_causa')} className={`mt-1 w-full md:w-1/3 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Breve Relato / Fatos</label>
              <textarea {...register('resumo_fato')} rows={4} className={`mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none transition-colors ${
                tipoJustica === 'judicial' ? 'focus:border-blue-400' : 'focus:border-amber-400'
              }`} placeholder={tipoJustica === 'judicial' ? 'Descreva os motivos e fatos da ação judicial...' : 'Descreva os motivos da mediação...'} />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
           <button type="submit" className={`font-bold px-8 py-3 rounded-lg transition-colors text-sm shadow-md ${
             tipoJustica === 'judicial' 
               ? 'bg-blue-600 hover:bg-blue-700 text-white' 
               : 'bg-slate-200 hover:bg-white text-slate-900'
           }`}>
             {tipoJustica === 'judicial' ? 'Criar Processo Judicial' : 'Criar Processo Manualmente'}
           </button>
        </div>
      </form>
    </div>
  );
}
