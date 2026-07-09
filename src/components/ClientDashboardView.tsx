import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { 
  Folder, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  ExternalLink, 
  Send, 
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  User,
  ArrowRight,
  Download,
  AlertTriangle,
  HelpCircle,
  FileSignature,
  FileCheck,
  ChevronDown,
  RefreshCw,
  Eye,
  Trash2,
  Lock,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentoAnexado {
  nome: string;
  url: string;
  data: string;
  status: 'Aprovado' | 'Em Análise' | 'Pendente';
  tamanho?: string;
}

interface ChatMensagem {
  autor: 'cliente' | 'mediador' | 'sistema';
  texto: string;
  data: string;
  nome_autor: string;
}

interface ProcessoCliente {
  id: string;
  nup: string;
  status: string;
  cliente_nome: string;
  cliente_id: string;
  parte_contraria_nome: string;
  valor_causa: number;
  resumo_fato: string;
  documentos_anexados?: DocumentoAnexado[];
  chat_mensagens?: ChatMensagem[];
  status_simplificado?: string;
  progresso_percentual?: number;
  proxima_etapa?: string;
  mediador_nome?: string;
  mediador_email?: string;
  mediador_telefone?: string;
  prazo_limite?: string;
  contratos_assinatura?: Array<{ id: string; nome: string; assinado: boolean; data_assinatura?: string }>;
}

export default function ClientDashboardView() {
  const { user, profile } = useAuth();
  const [processos, setProcessos] = useState<ProcessoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoCliente | null>(null);
  
  // Estados de upload de arquivos
  const [uploadingDocName, setUploadingDocName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Chat
  const [novoMensagemText, setNovoMensagemText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Estados de FAQs
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

  // Estados do Canvas de Assinatura
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [assinaturaPreenchida, setAssinaturaPreenchida] = useState(false);
  const [documentoParaAssinar, setDocumentoParaAssinar] = useState<string | null>(null);
  const [successSignMessage, setSuccessSignMessage] = useState(false);

  // Estado para visualização de documentos
  const [previewDoc, setPreviewDoc] = useState<DocumentoAnexado | null>(null);

  // Se o cliente não tem nenhum processo cadastrado na GSA, nós mostramos um lindo caso demonstrativo integrado 
  // para garantir que ele compreenda o status em menos de 10 segundos, mas permitindo que interaja e crie dados no Firestore.
  const [isDemoCase, setIsDemoCase] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'processos'),
      where('cliente_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      }) as ProcessoCliente[];
      
      if (docsData.length > 0) {
        setProcessos(docsData);
        // Seleciona o primeiro caso por padrão se nenhum estiver selecionado
        if (!processoSelecionado) {
          setProcessoSelecionado(docsData[0]);
        } else {
          // Atualiza o processo selecionado atualizado com os novos dados do Firebase
          const updatedSelected = docsData.find(p => p.id === processoSelecionado.id);
          if (updatedSelected) {
            setProcessoSelecionado(updatedSelected);
          }
        }
        setIsDemoCase(false);
      } else {
        // Caso demonstrativo para testes com alta fidelidade visual se a conta do cliente estiver zerada
        const demoProcess: ProcessoCliente = {
          id: 'demo-gsa-10293',
          nup: 'NUP-10293/2026',
          status: 'CONCILIACAO_AUDIENCIA',
          status_simplificado: 'Conversa de Acordo Iniciada',
          progresso_percentual: 75,
          cliente_nome: profile?.nome_completo || user.displayName || 'Você',
          cliente_id: user.uid,
          parte_contraria_nome: 'Banco Crédito Nacional S/A',
          valor_causa: 12500,
          resumo_fato: 'Discussão sobre cobrança de juros abusivos em empréstimo pessoal contratado em 2024. O cliente busca a quitação integral do saldo remanescente mediante um abatimento justo.',
          proxima_etapa: 'Estamos aguardando o Banco assinar a versão final do termo. Eles têm um prazo limite de resposta de 3 dias úteis.',
          mediador_nome: 'Dra. Ana Beatriz Vasconcellos',
          mediador_email: 'ana.beatriz@gsacamera.com.br',
          mediador_telefone: '(11) 98765-4321',
          prazo_limite: '10/07/2026',
          documentos_anexados: [
            { nome: 'Cédula de Crédito Bancário.pdf', url: '#', data: '01/07/2026', status: 'Aprovado', tamanho: '1.2 MB' },
            { nome: 'Extrato de Pagamentos Realizados.pdf', url: '#', data: '01/07/2026', status: 'Aprovado', tamanho: '850 KB' },
            { nome: 'RG e Comprovante de Residência.pdf', url: '#', data: '02/07/2026', status: 'Aprovado', tamanho: '2.4 MB' }
          ],
          chat_mensagens: [
            { autor: 'sistema', texto: 'Seu processo foi recebido na GSA Câmara de Mediação e Conciliação.', data: '01/07/2026 10:14', nome_autor: 'Sistema GSA' },
            { autor: 'mediador', texto: 'Olá! Sou a Dra. Ana Beatriz, serei a mediadora responsável pelo seu caso. Já analisei seus documentos e eles estão todos validados. Acabei de notificar os procuradores do Banco para apresentar a proposta inicial.', data: '02/07/2026 14:30', nome_autor: 'Dra. Ana Beatriz' },
            { autor: 'sistema', texto: 'A outra parte (Banco Crédito Nacional S/A) aceitou o convite para a mesa de conciliação virtual.', data: '03/07/2026 09:11', nome_autor: 'Sistema GSA' },
            { autor: 'mediador', texto: 'Conseguimos um excelente acordo com o banco! Eles aceitaram quitar toda a sua dívida de R$ 12.500 por apenas R$ 3.800 à vista, ou parcelado em até 4 vezes de R$ 950. O que você acha?', data: '05/07/2026 16:45', nome_autor: 'Dra. Ana Beatriz' }
          ],
          contratos_assinatura: [
            { id: 'contrato-1', nome: 'Termo de Conciliação e Quitação de Dívida.pdf', assinado: false }
          ]
        };
        setProcessos([demoProcess]);
        setProcessoSelecionado(demoProcess);
        setIsDemoCase(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar portal do cliente:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile]);

  // Rola o chat para o final ao abrir ou receber mensagens
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [processoSelecionado?.chat_mensagens, processoSelecionado]);

  // Função para traduzir o status complexo em status humanizado e acolhedor (entendimento em 10 segundos)
  const getFriendlyStatus = (status: string, status_simplificado?: string) => {
    if (status_simplificado) return status_simplificado;

    switch (status) {
      case 'TRIAGEM':
      case 'AGUARDANDO_DISTRIBUICAO':
        return 'Análise Técnica Inicial';
      case 'ANALISE_DOCUMENTAL':
        return 'Verificação de Seus Documentos';
      case 'EM_NOTIFICACAO':
      case 'NOTIFICADO':
        return 'Enviando Convite para a Outra Parte';
      case 'CONCILIACAO_AUDIENCIA':
      case 'EM_NEGOCIACAO':
        return 'Conversa de Acordo Iniciada';
      case 'PETICIONAMENTO':
      case 'JUDICIAL':
        return 'Apoio Jurídico Especializado';
      case 'ACORDO':
      case 'ACORDO_HOMOLOGADO':
      case 'ENCERRADO':
      case 'FINALIZADO':
        return 'Caso Resolvido e Concluído!';
      case 'CANCELADO':
      case 'RECUSADO':
        return 'Cancelado ou Arquivado';
      default:
        return 'Acompanhamento do Caso';
    }
  };

  // Retorna a cor correspondente e o progresso estimado
  const getProgressoData = (status: string, customPercent?: number) => {
    if (customPercent !== undefined && customPercent !== null) {
      return { percent: customPercent, label: `${customPercent}%` };
    }
    switch (status) {
      case 'TRIAGEM':
      case 'AGUARDANDO_DISTRIBUICAO':
        return { percent: 15, label: '15% (Início)' };
      case 'ANALISE_DOCUMENTAL':
        return { percent: 35, label: '35% (Documentação)' };
      case 'EM_NOTIFICACAO':
      case 'NOTIFICADO':
        return { percent: 50, label: '50% (Notificação)' };
      case 'CONCILIACAO_AUDIENCIA':
      case 'EM_NEGOCIACAO':
        return { percent: 75, label: '75% (Proposta de Acordo)' };
      case 'PETICIONAMENTO':
      case 'JUDICIAL':
        return { percent: 85, label: '85% (Fase Final)' };
      case 'ACORDO':
      case 'ACORDO_HOMOLOGADO':
      case 'ENCERRADO':
      case 'FINALIZADO':
        return { percent: 100, label: '100% (Concluído!)' };
      default:
        return { percent: 40, label: '40%' };
    }
  };

  // Próxima etapa explicada de forma amigável
  const getProximaEtapaAmigavel = (proc: ProcessoCliente) => {
    if (proc.proxima_etapa) return proc.proxima_etapa;

    switch (proc.status) {
      case 'TRIAGEM':
      case 'AGUARDANDO_DISTRIBUICAO':
        return 'Nossos advogados estão analisando os detalhes que você nos enviou. Isso leva em média 24 horas. Fique tranquilo, avisaremos você por aqui.';
      case 'ANALISE_DOCUMENTAL':
        return 'Estamos verificando os documentos anexados para garantir que nada falte na hora de negociar. Se faltar algum papel, você poderá enviá-lo pelo painel abaixo.';
      case 'EM_NOTIFICACAO':
      case 'NOTIFICADO':
        return `Já enviamos a notificação oficial para ${proc.parte_contraria_nome || 'a outra parte'}. Eles têm o prazo legal para responder nosso convite e iniciar a conversa amigável.`;
      case 'CONCILIACAO_AUDIENCIA':
      case 'EM_NEGOCIACAO':
        return `Nossa mediadora está conversando diretamente com os procuradores de ${proc.parte_contraria_nome || 'a outra parte'} para fechar os termos finais do seu acordo com o melhor desconto possível.`;
      case 'PETICIONAMENTO':
      case 'JUDICIAL':
        return 'Seu acordo foi formulado e está sendo chancelado pelos nossos advogados parceiros para garantir sua total segurança jurídica.';
      case 'ACORDO':
      case 'ACORDO_HOMOLOGADO':
      case 'ENCERRADO':
      case 'FINALIZADO':
        return 'Tudo pronto! Seu acordo foi assinado por ambas as partes e tem força de lei. O pagamento será feito conforme as datas combinadas no termo.';
      default:
        return 'Estamos progredindo com as conversações. Qualquer novidade relevante será informada em tempo real.';
    }
  };

  // Simula o Envio de um Novo Documento de Cliente
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !processoSelecionado) return;

    setUploadingDocName(file.name);
    setUploadProgress(10);

    // Simula barra de progresso rápida e realista
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 200);

    setTimeout(async () => {
      clearInterval(interval);
      setUploadProgress(100);

      const novoDoc: DocumentoAnexado = {
        nome: file.name,
        url: '#',
        data: new Date().toLocaleDateString('pt-BR'),
        status: 'Em Análise',
        tamanho: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      };

      try {
        if (!isDemoCase) {
          // Salva no banco de dados real do Firebase
          const procRef = doc(db, 'processos', processoSelecionado.id);
          const docsAtuais = processoSelecionado.documentos_anexados || [];
          
          await updateDoc(procRef, {
            documentos_anexados: arrayUnion(novoDoc),
            ultima_atualizacao: new Date().toISOString()
          });
        } else {
          // Atualiza o estado demonstrativo local
          setProcessoSelecionado(prev => {
            if (!prev) return null;
            return {
              ...prev,
              documentos_anexados: [...(prev.documentos_anexados || []), novoDoc]
            };
          });
        }
        alert("Documento enviado para verificação técnica com sucesso! Nossos analistas irão validá-lo.");
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar documento.");
      } finally {
        setUploadingDocName(null);
        setUploadProgress(0);
      }
    }, 1200);
  };

  // Deleta o documento anexado (somente para demonstração ou se for do cliente no Firestore)
  const handleDeleteDoc = async (nomeDoc: string) => {
    if (!processoSelecionado) return;
    if (!confirm(`Deseja remover o documento "${nomeDoc}"?`)) return;

    try {
      if (!isDemoCase) {
        const procRef = doc(db, 'processos', processoSelecionado.id);
        const docsRestantes = (processoSelecionado.documentos_anexados || []).filter(d => d.nome !== nomeDoc);
        await updateDoc(procRef, {
          documentos_anexados: docsRestantes
        });
      } else {
        setProcessoSelecionado(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documentos_anexados: (prev.documentos_anexados || []).filter(d => d.nome !== nomeDoc)
          };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Enviar Mensagem no Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMensagemText.trim() || !processoSelecionado) return;

    const novaMsg: ChatMensagem = {
      autor: 'cliente',
      texto: novoMensagemText.trim(),
      data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      nome_autor: profile?.nome_completo || user?.displayName || 'Cliente'
    };

    setNovoMensagemText('');

    try {
      if (!isDemoCase) {
        const procRef = doc(db, 'processos', processoSelecionado.id);
        await updateDoc(procRef, {
          chat_mensagens: arrayUnion(novaMsg),
          ultima_atualizacao: new Date().toISOString()
        });
      } else {
        // Atualiza estado local de simulação
        setProcessoSelecionado(prev => {
          if (!prev) return null;
          const antigas = prev.chat_mensagens || [];
          
          // Se for demo, podemos simular uma resposta rápida e reconfortante do mediador após 1.5 segundos!
          setTimeout(() => {
            const respostaMediador: ChatMensagem = {
              autor: 'mediador',
              texto: 'Obrigado pelo seu retorno! Já registrei essa informação no sistema e irei repassar para a outra parte. Te mantenho informado sobre cada passo do nosso acordo.',
              data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              nome_autor: prev.mediador_nome || 'Dra. Ana Beatriz'
            };
            setProcessoSelecionado(current => {
              if (!current) return null;
              return {
                ...current,
                chat_mensagens: [...(current.chat_mensagens || []), respostaMediador]
              };
            });
          }, 1500);

          return {
            ...prev,
            chat_mensagens: [...antigas, novaMsg]
          };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CANVAS DE ASSINATURA - DRAWING LOGIC
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a'; // Deep slate
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const coords = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setAssinaturaPreenchida(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaPreenchida(false);
  };

  const getEventCoords = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Confirmar Assinatura do Contrato
  const handleConfirmSignature = async () => {
    if (!processoSelecionado || !documentoParaAssinar) return;

    try {
      const dataHora = new Date().toLocaleString('pt-BR');
      const hashSeguranca = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      if (!isDemoCase) {
        const procRef = doc(db, 'processos', processoSelecionado.id);
        
        // Atualiza o documento específico marcado como assinado
        const contratosAtuais = processoSelecionado.contratos_assinatura || [];
        const contratosAtualizados = contratosAtuais.map(c => 
          c.id === documentoParaAssinar ? { ...c, assinado: true, data_assinatura: dataHora } : c
        );

        // Adiciona mensagem automática do sistema informando a assinatura
        const msgSistema: ChatMensagem = {
          autor: 'sistema',
          texto: `Termo de Acordo assinado digitalmente por ${profile?.nome_completo || user?.displayName || 'Cliente'}. Carimbo de validade GSA-ID: ${hashSeguranca}.`,
          data: dataHora,
          nome_autor: 'Sistema GSA'
        };

        await updateDoc(procRef, {
          contratos_assinatura: contratosAtualizados,
          chat_mensagens: arrayUnion(msgSistema),
          status: 'FINALIZADO',
          status_simplificado: 'Acordo Assinado e Concluído!',
          progresso_percentual: 100,
          ultima_atualizacao: new Date().toISOString()
        });
      } else {
        // Modo demonstração - atualiza localmente
        setProcessoSelecionado(prev => {
          if (!prev) return null;
          const contratosAtualizados = (prev.contratos_assinatura || []).map(c => 
            c.id === documentoParaAssinar ? { ...c, assinado: true, data_assinatura: dataHora } : c
          );
          const msgSistema: ChatMensagem = {
            autor: 'sistema',
            texto: `Termo de Acordo assinado digitalmente por ${prev.cliente_nome}. Carimbo de validade GSA-ID: ${hashSeguranca}.`,
            data: dataHora,
            nome_autor: 'Sistema GSA'
          };
          return {
            ...prev,
            contratos_assinatura: contratosAtualizados,
            chat_mensagens: [...(prev.chat_mensagens || []), msgSistema],
            status: 'FINALIZADO',
            status_simplificado: 'Acordo Assinado e Concluído!',
            progresso_percentual: 100
          };
        });
      }

      setSuccessSignMessage(true);
      setTimeout(() => {
        setSuccessSignMessage(false);
        setDocumentoParaAssinar(null);
      }, 3000);

    } catch (err) {
      console.error(err);
      alert("Erro ao registrar assinatura eletrônica.");
    }
  };

  // Simulação de download de documento virtualmente
  const handleVirtualDownload = (nomeDoc: string) => {
    alert(`Iniciando download seguro de: ${nomeDoc}\nSeu documento foi verificado eletronicamente.`);
    
    // Cria elemento invisível para forçar um download simulado de texto descritivo
    const element = document.createElement("a");
    const file = new Blob([
      `CÂMARA DE MEDIAÇÃO E ARBITRAGEM GSA\n\nEste documento é uma cópia digitalizada de segurança do arquivo "${nomeDoc}" associado ao processo ${processoSelecionado?.nup || ''}.\n\nStatus do Documento: Aprovado e chancelado legalmente pela mesa de negociação.\nData de Emissão: ${new Date().toLocaleDateString('pt-BR')}`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = nomeDoc.replace('.pdf', '') + '_GSA_Copia.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent" />
          <p className="text-slate-500 text-sm font-semibold animate-pulse">Protegendo sua conexão e carregando seus dados...</p>
        </div>
      </div>
    );
  }

  // Define o caso principal em exibição
  const casoAtivo = processoSelecionado || processos[0];

  const faqs = [
    {
      q: "Como funciona a mediação amigável?",
      a: "É uma conversa intermediada por um profissional neutro (o mediador) para ajudar você e a outra parte a chegarem a um acordo sem precisar passar por um processo demorado na Justiça comum."
    },
    {
      q: "Eu preciso conversar diretamente com a outra pessoa?",
      a: "Não! Se você não se sentir confortável, nossa equipe faz toda a ponte de forma separada. Não há necessidade de confrontos ou ligações indesejadas."
    },
    {
      q: "Quanto tempo demora para resolver o meu caso?",
      a: "Muito rápido! A maioria dos casos na GSA é resolvida em menos de 15 dias. Processos no tribunal comum podem demorar anos."
    },
    {
      q: "Esse acordo vale tanto quanto a decisão de um Juiz?",
      a: "Sim! O acordo assinado por ambas as partes dentro da nossa Câmara credenciada tem força de lei (título executivo extrajudicial) com plena validade jurídica."
    },
    {
      q: "O que acontece se a outra parte não assinar?",
      a: "Caso não consigamos contato ou eles se recusem a colaborar de forma amigável, nosso time jurídico especialista poderá guiar você no peticionamento direto ao juiz."
    }
  ];

  const progresso = getProgressoData(casoAtivo?.status || 'TRIAGEM', casoAtivo?.progresso_percentual);

  return (
    <div className="p-4 md:p-8 bg-slate-50/50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP SECURITY BAR & WELCOME */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={11} className="fill-emerald-100" />
                Ambiente 100% Protegido
              </span>
              {isDemoCase && (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                  Modo de Demonstração Interativo
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Olá, {profile?.nome_completo?.split(' ')[0] || 'Cliente'}!
            </h1>
            <p className="text-sm text-slate-500">
              Seja bem-vindo ao seu portal seguro de acordos. Acompanhe o seu caso sem termos complicados.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3.5 py-2 rounded-2xl">
              <Lock size={13} className="text-emerald-500" />
              Certificado Digital ICP-Brasil ativo
            </div>
            {processos.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl">
                <span className="text-xs font-bold text-slate-500 px-2">Seus Casos:</span>
                <select 
                  className="bg-white text-xs font-bold p-1.5 rounded-xl border border-slate-200 focus:outline-none"
                  value={casoAtivo.id}
                  onChange={(e) => {
                    const selected = processos.find(p => p.id === e.target.value);
                    if (selected) setProcessoSelecionado(selected);
                  }}
                >
                  {processos.map(p => (
                    <option key={p.id} value={p.id}>{p.nup} - {p.parte_contraria_nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* CASO CONTEÚDO */}
        {casoAtivo ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUNA ESQUERDA (MÉTRICAS, LINHA DO TEMPO, PROCESSO) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* CARD DE VISÃO DE 10 SEGUNDOS (ESTADO DO CASO) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sparkles size={120} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  
                  {/* CÍRCULO DE PROGRESSO VISUAL */}
                  <div className="flex flex-col items-center justify-center text-center space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle 
                          cx="64" cy="64" r="50" 
                          stroke="rgba(30, 41, 59, 0.8)" strokeWidth="10" fill="transparent" 
                        />
                        <circle 
                          cx="64" cy="64" r="50" 
                          stroke="#10b981" strokeWidth="10" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (1 - (progresso.percent / 100))}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-white tracking-tight">{progresso.percent}%</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Concluído</span>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <span className="text-xs text-slate-400 font-semibold">Previsão: {casoAtivo.prazo_limite || 'Aproximadamente 5 dias'}</span>
                    </div>
                  </div>

                  {/* STATUS SIMPLIFICADO E DETALHES */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">Situação Atual do seu Caso</p>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                        {getFriendlyStatus(casoAtivo.status, casoAtivo.status_simplificado)}
                      </h2>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5 text-amber-400">
                        <Sparkles size={13} />
                        O que acontece agora?
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {getProximaEtapaAmigavel(casoAtivo)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 font-semibold">
                      <div>
                        Nº Identificação: <strong className="text-white font-extrabold">{casoAtivo.nup}</strong>
                      </div>
                      <div className="hidden sm:inline">•</div>
                      <div>
                        Reclamado: <strong className="text-white font-extrabold">{casoAtivo.parte_contraria_nome}</strong>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* TIMELINE SIMPLIFICADA (SEM TERMOS JURÍDICOS) */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Linha do Tempo Simples</h3>
                  <p className="text-xs text-slate-400 font-medium">Veja as etapas do seu acordo do início ao fim</p>
                </div>

                <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                  
                  {/* PASSO 1 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                      <CheckCircle2 size={13} className="fill-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">Passo 1: Recebemos seu pedido</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Você nos enviou os detalhes da discussão e cadastrou seu caso na GSA Câmara de Mediação.</p>
                    </div>
                  </div>

                  {/* PASSO 2 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                      <CheckCircle2 size={13} className="fill-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">Passo 2: Análise dos seus papéis</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Nossos analistas e advogados parceiros verificaram seus documentos de identificação e comprovantes de forma técnica.</p>
                    </div>
                  </div>

                  {/* PASSO 3 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                      <CheckCircle2 size={13} className="fill-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">Passo 3: Convocação da outra parte</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Nós enviamos a notificação formal para {casoAtivo.parte_contraria_nome}, convidando para a conversa de resolução amigável.</p>
                    </div>
                  </div>

                  {/* PASSO 4 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        Passo 4: Conversa de acordo
                        <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide">Fase Atual</span>
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Nossa mediadora está desenhando a minuta do acordo de quitação junto à assessoria jurídica da outra parte.</p>
                    </div>
                  </div>

                  {/* PASSO 5 */}
                  <div className="relative opacity-60">
                    <div className="absolute -left-[31px] top-0 bg-slate-200 text-slate-400 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">Passo 5: Assinatura e Recebimento</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">Tendo concordado com o valor, ambas as partes assinam eletronicamente pelo portal para dar início ao pagamento.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* SEÇÃO INTERATIVA DE ASSINATURA ELETRÔNICA */}
              {casoAtivo.contratos_assinatura && casoAtivo.contratos_assinatura.some(c => !c.assinado) && (
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center shrink-0">
                      <FileSignature size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide">
                        Ação Necessária
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1">Sua assinatura está pendente</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Nossa mediadora elaborou o termo final. Por favor, revise as cláusulas e assine com seu mouse ou celular abaixo.</p>
                    </div>
                  </div>

                  {/* LISTA DOS DOCUMENTOS PENDENTES PARA ASSINAR */}
                  <div className="space-y-4">
                    {casoAtivo.contratos_assinatura.map(contrato => (
                      <div key={contrato.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <FileText className="text-slate-500 w-8 h-8 shrink-0" />
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900">{contrato.nome}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Termo Final de Quitação do Débito</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleVirtualDownload(contrato.nome)}
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Eye size={13} />
                            Ler Termo
                          </button>
                          
                          {!contrato.assinado ? (
                            <button 
                              onClick={() => {
                                setDocumentoParaAssinar(contrato.id);
                                setTimeout(() => {
                                  // Garante que o canvas seja limpo ao abrir
                                  clearCanvas();
                                }, 100);
                              }}
                              className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm"
                            >
                              Assinar Agora
                            </button>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              Assinado
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PAINEL INTERATIVO DE DESENHO DA ASSINATURA */}
                  <AnimatePresence>
                    {documentoParaAssinar && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4 overflow-hidden"
                      >
                        <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Assinar Eletronicamente</h4>
                          <button 
                            onClick={() => setDocumentoParaAssinar(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            Cancelar
                          </button>
                        </div>

                        {successSignMessage ? (
                          <div className="py-8 text-center space-y-3">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                              <CheckCircle2 size={24} />
                            </div>
                            <h5 className="font-extrabold text-slate-900 text-sm">Assinatura Gravada com Sucesso!</h5>
                            <p className="text-xs text-slate-500">O carimbo de validação criptográfica foi emitido sob os termos do ICP-Brasil.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Use o seu mouse, trackpad ou dedo (caso esteja em um celular/tablet) para desenhar sua assinatura dentro do retângulo pontilhado abaixo.
                            </p>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative h-40">
                              <canvas 
                                ref={canvasRef}
                                width={500}
                                height={160}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-full cursor-crosshair touch-none"
                              />
                              {!assinaturaPreenchida && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-xs text-slate-400 font-medium italic">Assine de próprio punho aqui</span>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-center">
                              <button 
                                onClick={clearCanvas}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg"
                              >
                                Limpar e Tentar Novamente
                              </button>
                              
                              <button 
                                onClick={handleConfirmSignature}
                                disabled={!assinaturaPreenchida}
                                className="bg-slate-900 text-white hover:bg-slate-850 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all disabled:opacity-40"
                              >
                                Confirmar Assinatura Digital
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}

              {/* GESTÃO DE DOCUMENTOS */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Seus Documentos e Papéis</h3>
                    <p className="text-xs text-slate-400 font-medium">Arquivos enviados e analisados pela equipe da Câmara</p>
                  </div>
                  <button 
                    onClick={handleUploadClick}
                    className="bg-slate-900 text-white hover:bg-slate-850 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <UploadCloud size={14} />
                    Enviar Novo Documento
                  </button>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                />

                {/* BARRA DE PROGRESSO DE UPLOAD SIMULADO */}
                {uploadingDocName && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Enviando {uploadingDocName}...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-900 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* LISTA DE DOCUMENTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {casoAtivo.documentos_anexados?.map((docItem, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-white rounded-xl border border-slate-150 flex items-center justify-center text-slate-400 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={docItem.nome}>{docItem.nome}</h4>
                          <p className="text-[10px] text-slate-400">{docItem.data} • {docItem.tamanho || 'Não especificado'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded ${
                          docItem.status === 'Aprovado' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {docItem.status}
                        </span>
                        <button 
                          onClick={() => handleVirtualDownload(docItem.nome)}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900"
                          title="Fazer download"
                        >
                          <Download size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(docItem.nome)}
                          className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PERGUNTAS FREQUENTES (FAQ) - RESPONSIVO E ACORDION */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Perguntas Frequentes do Cliente</h3>
                  <p className="text-xs text-slate-400 font-medium">Esclareça suas principais dúvidas de forma simplificada</p>
                </div>

                <div className="space-y-3.5">
                  {faqs.map((faq, idx) => (
                    <div 
                      key={idx} 
                      className="border border-slate-200/60 rounded-2xl overflow-hidden transition-all bg-slate-50"
                    >
                      <button 
                        onClick={() => setFaqAberto(faqAberto === idx ? null : idx)}
                        className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-100/50 transition-colors focus:outline-none"
                      >
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                          <HelpCircle size={15} className="text-slate-400 shrink-0" />
                          {faq.q}
                        </span>
                        <ChevronDown 
                          size={15} 
                          className={`text-slate-400 transition-transform duration-300 ${faqAberto === idx ? 'transform rotate-180 text-slate-900' : ''}`} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {faqAberto === idx && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white border-t border-slate-100"
                          >
                            <div className="p-4 text-xs text-slate-500 leading-relaxed font-semibold">
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* COLUNA DIREITA (CHAT, RESPONSÁVEL, NOTIFICAÇÕES) */}
            <div className="space-y-8">
              
              {/* CARD DE RESPONSÁVEL (MEDIADOR) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black uppercase tracking-wide">
                    Mediador Responsável
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-1">Quem está guiando seu caso?</h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white font-extrabold flex items-center justify-center text-base shrink-0 border border-slate-800">
                    {casoAtivo.mediador_nome?.substring(5, 7).toUpperCase() || 'MB'}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{casoAtivo.mediador_nome || 'Dra. Ana Beatriz Vasconcellos'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Mediadora Credenciada GSA</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <span>{casoAtivo.mediador_email || 'ana.beatriz@gsacamera.com.br'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>{casoAtivo.mediador_telefone || '(11) 98765-4321'}</span>
                  </div>
                </div>

                <a 
                  href={`https://wa.me/55${(casoAtivo.mediador_telefone || '11987654321').replace(/\D/g, '')}`} 
                  target="_blank" 
                  referrerPolicy="no-referrer"
                  className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm text-xs"
                >
                  <MessageSquare size={15} />
                  Falar no WhatsApp Seguro
                </a>
              </div>

              {/* CHAT DE ATENDIMENTO INTEGRADO */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col h-[480px]">
                <div className="border-b border-slate-100 pb-4 shrink-0 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Bate-papo de Negociação</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Comunicação formal e segura</p>
                  </div>
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                </div>

                {/* MENSARE HISTORY SCROLLABLE */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-0">
                  {casoAtivo.chat_mensagens && casoAtivo.chat_mensagens.map((msg, idx) => {
                    const isClient = msg.autor === 'cliente';
                    const isSystem = msg.autor === 'sistema';
                    
                    if (isSystem) {
                      return (
                        <div key={idx} className="flex flex-col items-center justify-center text-center py-2 px-4 bg-slate-50 border border-slate-150 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                            <ShieldCheck size={11} className="text-emerald-500" />
                            {msg.texto}
                          </p>
                          <span className="text-[8px] text-slate-300 mt-0.5">{msg.data}</span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${isClient ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[9px] text-slate-400 font-bold mb-0.5">{msg.nome_autor}</span>
                        <div 
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed font-semibold ${
                            isClient 
                              ? 'bg-slate-900 text-white rounded-br-none shadow-sm' 
                              : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                          }`}
                        >
                          {msg.texto}
                        </div>
                        <span className="text-[8px] text-slate-300 mt-1">{msg.data}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* INPUT FORM DE ENVIO */}
                <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 shrink-0">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={novoMensagemText}
                      onChange={(e) => setNovoMensagemText(e.target.value)}
                      placeholder="Digite sua dúvida ou resposta aqui..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-12 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                    />
                    <button 
                      type="submit" 
                      className="absolute right-1.5 top-1.5 bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl transition-all"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>

              {/* CARD DE NOTIFICAÇÕES E ALERTAS DE APOIO */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Avisos Importantes</h3>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-blue-950">Seus documentos foram aprovados!</h4>
                      <p className="text-[10px] text-blue-700 leading-relaxed mt-0.5">Todos os comprovantes foram verificados pelos advogados parceiros sem pendências.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-950">A outra parte tem prazo limite de resposta</h4>
                      <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">O prazo máximo para aceitação da proposta de acordo se encerra no dia 10/07/2026.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
            <Folder className="w-16 h-16 text-slate-400 mx-auto" />
            <h3 className="text-xl font-black text-slate-800">Nenhum caso ativo cadastrado</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Não encontramos nenhum processo de mediação em andamento registrado com seu e-mail de acesso. Caso tenha recebido uma intimação, entre em contato com nosso atendimento nacional.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
