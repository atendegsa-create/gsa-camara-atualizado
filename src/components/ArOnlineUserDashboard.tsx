import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Scale, 
  History,
  LayoutDashboard,
  CreditCard,
  Zap,
  ArrowRight,
  User,
  PlusCircle,
  FileText,
  Upload,
  FileType,
  X as CloseIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, getFirebaseStorage, ref, uploadBytes, getDownloadURL } from '../lib/firebase';

export default function ArOnlineUserDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'new_ar'>('dashboard');
  const [inputType, setInputType] = useState<'TEXT' | 'FILE'>('TEXT');
  const [selectedFile, setSelectedFile] = useState<{file?: File, name: string, size: string, base64: string} | null>(null);
  
  // Dados do formulário de envio
  const [formData, setFormData] = useState({
    destinatario_nome: '',
    destinatario_email: '',
    destinatario_whatsapp: '',
    assunto: '',
    mensagem: '',
    metodo: 'EMAIL' as 'EMAIL' | 'WHATSAPP'
  });

  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [rechargeQty, setRechargeQty] = useState(3);
  const [rechargeStep, setRechargeStep] = useState<'COMPRA'|'PAGAMENTO'|'SUCESSO'>('COMPRA');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargePixData, setRechargePixData] = useState<any>(null);

  useEffect(() => {
    try {
      // Tenta pegar o e-mail do localStorage (salvo no checkout)
      const savedEmail = localStorage.getItem('ar_online_email');
      if (savedEmail) {
        setUserEmail(savedEmail);
        fetchUserData(savedEmail);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Dashboard init error:", err);
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (email: string) => {
    console.log("Iniciando busca de dados para:", email);
    setLoading(true);
    try {
      // 1. Buscar créditos (pagamentos aprovados)
      const qPag = query(
        collection(db, 'pagamentos'), 
        where('email', '==', email.toLowerCase().trim()),
        where('status', 'in', ['PAGO', 'CONFIRMED'])
      );
      
      const snapPag = await getDocs(qPag);
      console.log("Pagamentos encontrados:", snapPag.size);
      
      let totalQty = 0;
      snapPag.forEach(doc => {
        totalQty += (doc.data().qty || 0);
      });

      // 2. Buscar histórico de envios (Removido orderBy para evitar erro de índice no dev)
      const qEnvios = query(
        collection(db, 'ar_envios'),
        where('remetente_email', '==', email.toLowerCase().trim())
      );
      
      const snapEnvios = await getDocs(qEnvios);
      console.log("Envios encontrados:", snapEnvios.size);
      
      const envios: any[] = [];
      snapEnvios.forEach(doc => envios.push({ id: doc.id, ...doc.data() }));

      // Ordenar manualmente no cliente para evitar necessidade de índice composto
      envios.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setCredits(totalQty - envios.length);
      setHistory(envios);
    } catch (err) {
      console.error("Erro crítico ao carregar dados do usuário AR:", err);
    } finally {
      console.log("Finalizando estado de carregamento.");
      setLoading(false);
    }
  };

  const handleSendAR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits <= 0) {
      alert("Você não possui créditos suficientes.");
      return;
    }

    setSending(true);
    try {
      let anexoData = selectedFile ? { name: selectedFile.name, size: selectedFile.size, url: '' } : null;

      if (selectedFile?.file) {
        const storage = getFirebaseStorage();
        if (storage) {
          const storageRef = ref(storage, `ar_envios/${Date.now()}_${selectedFile.file.name}`);
          const uploadResult = await uploadBytes(storageRef, selectedFile.file);
          const downloadUrl = await getDownloadURL(uploadResult.ref);
          anexoData!.url = downloadUrl;
        } else {
          throw new Error("Serviço de Storage não disponível");
        }
      }

      const payload = {
        ...formData,
        inputType,
        anexo: anexoData,
        remetente_email: userEmail?.toLowerCase().trim(),
        createdAt: serverTimestamp(),
        protocolo: `AR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        status: 'ENVIADO'
      };

      await addDoc(collection(db, 'ar_envios'), payload);
      
      setSuccessStatus(payload.protocolo);
      setTimeout(() => {
        setSuccessStatus(null);
        setView('dashboard');
        if (userEmail) fetchUserData(userEmail);
      }, 3000);

    } catch (err) {
      console.error("Erro ao enviar AR:", err);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("O arquivo deve ter no máximo 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          file: file,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
          base64: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRechargeCheckout = async () => {
    setRechargeLoading(true);
    try {
      // Create a temporary lead ID just for the recharge process
      const idToUse = 'RECHARGE_' + (userEmail || 'unknown') + '_' + Date.now();
      
      const response = await fetch(`/api/finance/gerar-cobranca-servico/${idToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servico: 'creditos_ar_online',
          quantidade: rechargeQty,
          valor: rechargeQty * 4.97,
          descricao: `Recarga de ${rechargeQty} Notificações Extrajudiciais (AR Online) para ${userEmail}`
        })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar cobrança');
      
      setRechargePixData(data.cobranca);
      setRechargeStep('PAGAMENTO');
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao gerar a recarga. Tente novamente.");
    } finally {
      setRechargeLoading(false);
    }
  };

  const simularPagamentoRecarga = async () => {
    // Para dev: Simular crédito sendo adicionado ao email
    try {
        await addDoc(collection(db, 'pagamentos'), {
            email: userEmail,
            qty: rechargeQty,
            status: 'PAGO',
            createdAt: serverTimestamp(),
            type: 'RECHARGE'
        });
        setRechargeStep('SUCESSO');
        fetchUserData(userEmail!);
    } catch(e) {
        console.error(e);
        setRechargeStep('SUCESSO'); 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Zap className="text-[#d4af37] w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!userEmail && !loading) {
    return (
        <div className="min-h-screen bg-[#0a192f] flex items-center justify-center p-6">
            <div className="bg-white rounded-[40px] p-12 max-w-md w-full text-center space-y-8 shadow-2xl">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto text-[#d4af37]">
                    <ShieldCheck size={40} />
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl font-serif font-bold text-slate-900">Acesse sua Central AR</h2>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Identificamos que sua sessão expirou ou você ainda não informou seu e-mail de acesso.
                    </p>
                </div>
                <div className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="E-mail de compra"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const email = (e.target as HTMLInputElement).value;
                                if (email) {
                                    localStorage.setItem('ar_online_email', email);
                                    setUserEmail(email);
                                    fetchUserData(email);
                                }
                            }
                        }}
                    />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pressione Enter para validar</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <nav className="bg-[#0a192f] text-white py-6 px-10 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#d4af37] p-2 rounded-xl">
             <Scale size={24} className="text-[#0a192f]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl leading-none">GSA Portal AR</h1>
            <p className="text-[9px] text-[#d4af37] font-black tracking-widest uppercase">Validade Jurídica Superior</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
            <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário Ativo</span>
                <span className="text-xs font-bold text-white/80">{userEmail}</span>
            </div>
            <button 
                onClick={() => { localStorage.removeItem('ar_online_email'); window.location.reload(); }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
            >
                <User size={20} />
            </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar Tabs */}
          <aside className="w-full md:w-64 space-y-2">
            <button 
                onClick={() => setView('dashboard')}
                className={cn(
                    "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all",
                    view === 'dashboard' ? "bg-[#d4af37] text-[#0a192f] shadow-lg shadow-[#d4af37]/20" : "text-slate-400 hover:bg-slate-100"
                )}
            >
                <LayoutDashboard size={18} /> Resumo Geral
            </button>
            <button 
                onClick={() => setView('new_ar')}
                className={cn(
                    "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all",
                    view === 'new_ar' ? "bg-[#d4af37] text-[#0a192f] shadow-lg shadow-[#d4af37]/20" : "text-slate-400 hover:bg-slate-100"
                )}
            >
                <PlusCircle size={18} /> Novo Disparo AR
            </button>
          </aside>

          {/* Main Context */}
          <div className="flex-1">
             {view === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#0a192f] p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700" />
                           <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.3em] mb-4">Créditos Disponíveis</p>
                           <div className="flex items-end gap-3">
                               <h3 className="text-6xl font-black leading-none">{credits}</h3>
                               <span className="text-slate-400 font-bold mb-1">ARs</span>
                           </div>
                           <button 
                            onClick={() => setRechargeModalOpen(true)}
                            className="mt-8 flex items-center gap-2 bg-[#d4af37] text-[#0a192f] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                           >
                               <CreditCard size={14} /> Adicionar Créditos
                           </button>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm col-span-2 flex flex-col justify-center">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-600 shadow-inner">
                                    <ShieldCheck size={40} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Segurança ICP Brasil Ativa</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed max-w-sm text-sm">
                                        Todos os seus disparos possuem carimbo do tempo e são auditados pela ODR-TRUST.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick History */}
                    <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-serif font-bold text-[#0a192f] flex items-center gap-3">
                                <History size={24} className="text-[#d4af37]" />
                                Histórico de Notificações
                            </h3>
                            <button className="text-[10px] font-black text-slate-400 hover:text-[#d4af37] uppercase tracking-widest transition-all">Ver Relatório Completo</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinatário</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Método</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-gray-900">
                                    {history.map((h, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 font-mono text-xs font-bold text-slate-500">{h.protocolo}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-[#0a192f]">{h.destinatario_nome}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{h.destinatario_email || h.destinatario_whatsapp}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                    h.metodo === 'EMAIL' ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                                                )}>
                                                    {h.metodo === 'EMAIL' ? <Mail size={12} /> : <MessageSquare size={12} />}
                                                    {h.metodo}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-medium text-slate-500">
                                                {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString('pt-BR') : 'Agora'}
                                            </td>
                                            <td className="px-8 py-6 text-gray-900">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600">
                                                    <CheckCircle2 size={14} /> Entregue
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center space-y-6">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                                    <FileText size={32} />
                                                </div>
                                                <p className="text-slate-400 font-medium">Nenhum envio registrado ainda.</p>
                                                <button 
                                                    onClick={() => setView('new_ar')}
                                                    className="bg-[#0a192f] text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Fazer Primeiro Envio
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
             )}

             {view === 'new_ar' && (
                <div className="bg-white rounded-[48px] p-12 border-2 border-slate-100 shadow-xl max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-12">
                        <div className="w-16 h-16 bg-amber-50 text-[#d4af37] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-transparent">
                            <Send size={32} />
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-[#0a192f] mb-2">Novo Aviso de Recebimento</h2>
                        <p className="text-slate-400 font-medium font-sans">Preencha os dados do destinatário e do documento.</p>
                    </div>

                    {successStatus ? (
                        <div className="py-20 text-center space-y-8">
                             <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl ring-8 ring-green-50">
                                <CheckCircle2 size={56} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-serif font-bold text-[#0a192f]">AR Disparada!</h3>
                                <p className="text-slate-500 font-medium">Protocolo: <span className="font-mono font-black">{successStatus}</span></p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSendAR} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Destinatário</label>
                                    <input 
                                        required
                                        type="text"
                                        value={formData.destinatario_nome}
                                        onChange={e => setFormData({...formData, destinatario_nome: e.target.value})}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:ring-4 focus:ring-[#d4af37]/10 outline-none"
                                        placeholder="Nome Completo"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Envio</label>
                                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-100">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, metodo: 'EMAIL'})}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all gap-2 flex items-center justify-center",
                                                formData.metodo === 'EMAIL' ? "bg-white text-[#0a192f] shadow-sm" : "text-slate-400"
                                            )}
                                        >
                                            <Mail size={14} /> E-mail
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, metodo: 'WHATSAPP'})}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all gap-2 flex items-center justify-center",
                                                formData.metodo === 'WHATSAPP' ? "bg-white text-green-600 shadow-sm" : "text-slate-400"
                                            )}
                                        >
                                            <MessageSquare size={14} /> WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {formData.metodo === 'EMAIL' ? 'E-mail do Destinatário' : 'WhatsApp do Destinatário'}
                                </label>
                                <input 
                                    required
                                    type={formData.metodo === 'EMAIL' ? 'email' : 'tel'}
                                    value={formData.metodo === 'EMAIL' ? formData.destinatario_email : formData.destinatario_whatsapp}
                                    onChange={e => setFormData({...formData, [formData.metodo === 'EMAIL' ? 'destinatario_email' : 'destinatario_whatsapp']: e.target.value})}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold"
                                    placeholder={formData.metodo === 'EMAIL' ? 'email@destino.com.br' : '(00) 00000-0000'}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto / Título da Notificação</label>
                                <input 
                                    required
                                    type="text"
                                    value={formData.assunto}
                                    onChange={e => setFormData({...formData, assunto: e.target.value})}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold"
                                    placeholder="Ex: Notificação de Cobrança Indevida"
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setInputType('TEXT')}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all gap-2 flex items-center justify-center",
                                            inputType === 'TEXT' ? "bg-white text-[#0a192f] shadow-sm" : "text-slate-400"
                                        )}
                                    >
                                        <FileText size={14} /> Digitar Texto
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setInputType('FILE')}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all gap-2 flex items-center justify-center",
                                            inputType === 'FILE' ? "bg-white text-[#0a192f] shadow-sm" : "text-slate-400"
                                        )}
                                    >
                                        <Upload size={14} /> Anexar Documento
                                    </button>
                                </div>

                                {inputType === 'TEXT' ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem / Conteúdo do AR</label>
                                        <textarea 
                                            required
                                            rows={5}
                                            value={formData.mensagem}
                                            onChange={e => setFormData({...formData, mensagem: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold resize-none"
                                            placeholder="Descreva o teor da comunicação..."
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anexo Documental (PDF/Imagens)</label>
                                        {!selectedFile ? (
                                            <label className="flex flex-col items-center justify-center w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer hover:bg-slate-100 transition-all group">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">Clique para selecionar</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ou arraste seu arquivo aqui</p>
                                                </div>
                                                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                                            </label>
                                        ) : (
                                            <div className="bg-slate-50 border-2 border-slate-100 rounded-[32px] p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#0a192f] text-[#d4af37] rounded-2xl flex items-center justify-center">
                                                        <FileType size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedFile.size}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setSelectedFile(null)}
                                                    className="p-3 text-slate-400 hover:text-rose-600 transition-colors"
                                                >
                                                    <CloseIcon size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-slate-500">Custo do Envio:</span>
                                    <span className="font-black text-[#0a192f]">1 crédito AR</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-slate-500">Seu Saldo atual:</span>
                                    <span className={cn("font-black", credits > 0 ? "text-green-600" : "text-rose-600")}>{credits} créditos</span>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={sending || credits <= 0}
                                className={cn(
                                    "w-full py-6 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3",
                                    credits > 0 ? "bg-[#0a192f] text-white hover:scale-[1.02] active:scale-95 group" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                {sending ? 'Processando Validade ICP...' : (
                                    <>
                                        Gerar & Disparar Notificação
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
             )}
          </div>
        </div>
      </main>

      {/* Recharge Modal */}
      {rechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => {
                    setRechargeModalOpen(false);
                    setRechargeStep('COMPRA');
                  }}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"
                >
                    <CloseIcon size={24} />
                </button>

                {rechargeStep === 'COMPRA' && (
                    <>
                        <div className="flex justify-between items-center mb-8 pr-8">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                                <CreditCard className="w-6 h-6 text-slate-800" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recarga</p>
                                <h2 className="text-xl font-black text-slate-800">AR Créditos</h2>
                                <p className="text-[10px] text-slate-500 mt-1">{userEmail}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-500 tracking-wider mb-3 uppercase">Quantidade (Mín 1)</p>
                            <div className="flex items-center justify-between">
                            <button 
                                onClick={() => rechargeQty > 1 && setRechargeQty(rechargeQty - 1)}
                                disabled={rechargeQty <= 1}
                                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                -
                            </button>
                            <div className="flex-1 mx-4 bg-slate-50 rounded-2xl py-4 text-center">
                                <span className="text-3xl font-black text-slate-800">{rechargeQty}</span>
                            </div>
                            <button 
                                onClick={() => setRechargeQty(rechargeQty + 1)}
                                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                +
                            </button>
                            </div>
                        </div>

                        <div className="bg-[#1a2235] rounded-3xl p-6 text-center mb-8 shadow-lg">
                            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Preço por AR</p>
                            <p className="text-3xl font-black text-[#facc15]">R$ 4,97</p>
                        </div>

                        <div className="border-t border-slate-100 pt-6 mb-8 flex justify-between items-end">
                            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Total a pagar</p>
                            <p className="text-4xl font-black text-slate-900">R$ {(rechargeQty * 4.97).toFixed(2).replace('.', ',')}</p>
                        </div>

                        <button 
                            onClick={handleRechargeCheckout}
                            disabled={rechargeLoading}
                            className="w-full bg-[#5A5A40] hover:bg-slate-800 text-white font-black py-5 rounded-2xl tracking-widest uppercase text-sm shadow-xl transition-all flex items-center justify-center disabled:opacity-70"
                        >
                            {rechargeLoading ? 'Aguarde...' : 'Comprar Agora'}
                        </button>
                    </>
                )}

                {rechargeStep === 'PAGAMENTO' && rechargePixData && (
                    <div className="flex flex-col items-center text-center py-4">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Pague para Recarregar</h2>
                        <p className="text-slate-500 mb-6">Realize o pagamento de <strong className="text-slate-800">R$ {(rechargeQty * 4.97).toFixed(2).replace('.', ',')}</strong></p>
                        
                        <div className="w-full bg-slate-50 p-6 rounded-3xl border border-slate-200">
                            <div className="w-48 h-48 mx-auto bg-white mb-6 border border-slate-200 rounded-xl overflow-hidden">
                                {rechargePixData.qrCodeBase64 ? (
                                    <img src={rechargePixData.qrCodeBase64.startsWith('data:') ? rechargePixData.qrCodeBase64 : `data:image/png;base64,${rechargePixData.qrCodeBase64}`} alt="QR Code" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">QR CODE PIX</div>
                                )}
                            </div>
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">PIX Copia e Cola:</p>
                            <div className="bg-white p-4 rounded-xl border border-slate-300 text-[10px] break-all text-slate-600 font-mono mb-4 select-all shadow-sm max-h-24 overflow-y-auto">
                                {rechargePixData.pixCopiaECola || rechargePixData.qr_code || '00020101021126580014br.gov.bcb.pix...'}
                            </div>
                            
                            <button onClick={simularPagamentoRecarga} className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-600">Simular Pagamento Confirmado</button>
                        </div>
                    </div>
                )}

                {rechargeStep === 'SUCESSO' && (
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3">Créditos Adicionados!</h2>
                        <p className="text-slate-600 font-medium mb-8">
                            Seu saldo foi recarregado em <strong className="text-slate-800">{rechargeQty} ARs</strong>.
                        </p>
                        
                        <button 
                            onClick={() => {
                                setRechargeModalOpen(false);
                                setRechargeStep('COMPRA');
                            }} 
                            className="w-full bg-[#5A5A40] hover:bg-slate-800 text-white font-black py-4 rounded-2xl tracking-widest uppercase text-sm"
                        >
                            Voltar para o Painel
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      <footer className="py-12 text-center text-slate-400">
         <p className="text-[9px] font-black uppercase tracking-[0.3em]">GSA Câmara - v4.3.0 - Protocolo ODR v1.2</p>
         <p className="text-[9px] font-bold mt-2">Segurança de Dados LGPD-CERTIFIED</p>
      </footer>
    </div>
  );
}
