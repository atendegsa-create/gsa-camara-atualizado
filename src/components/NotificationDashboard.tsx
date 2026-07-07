import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, AlertCircle, Clock, Search, RefreshCw, Send, History, Filter } from 'lucide-react';

interface NotificationLog {
  id: string;
  processo_id: string;
  cliente_email?: string;
  tipo: string;
  assunto: string;
  data_envio: string;
  status: 'SUCESSO' | 'ERRO';
  erro?: string;
}

export function NotificationDashboard() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'history' | 'manual'>('history');

  const templates = [
    {
      name: "Boas-vindas (Novo Lead)",
      subject: "GSA - Sua Análise foi Iniciada!",
      body: "Olá!\n\nRecebemos seus dados para a análise de viabilidade técnica/jurídica.\n\nNossa inteligência artificial está processando suas informações e o resultado preliminar será liberado assim que o sistema confirmar o processamento.\n\nVocê pode acompanhar tudo pelo nosso portal usando seu CPF.\n\nAtenciosamente,\nEquipe GSA"
    },
    {
      name: "Lembrete de Pagamento",
      subject: "GSA - Lembrete de Pagamento do seu Protocolo",
      body: "Olá!\n\nIdentificamos que seu protocolo aguarda a confirmação do pagamento para prosseguimento.\n\nCaso já tenha realizado o PIX, aguarde alguns minutos pela compensação automática.\n\nSe tiver dúvidas, responda este e-mail ou entre em contato via WhatsApp.\n\nAtenciosamente,\nEquipe GSA"
    },
    {
      name: "Solicitação de Documentos",
      subject: "GSA - Precisamos de documentos complementares",
      body: "Olá!\n\nPara avançarmos com sua mediação, precisamos que anexe os documentos solicitados em nosso portal.\n\nDocumentos pendentes:\n- Extrato Evolutivo do Contrato\n- Comprovante de Residência\n- RG/CPF\n\nAcesse o Portal do Cliente e faça o upload agora mesmo para não atrasar seu processo.\n\nAtenciosamente,\nEquipe GSA"
    }
  ];

  // Manual Email Form
  const [manualTo, setManualTo] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: manualTo,
          subject: manualSubject,
          html: manualContent.replace(/\n/g, '<br>')
        })
      });
      const data = await res.json();
      setSendResult({ success: data.success, message: data.message });
      if (data.success) {
        setManualTo('');
        setManualSubject('');
        setManualContent('');
        fetchLogs(); // Atualiza histórico
      }
    } catch (err) {
      setSendResult({ success: false, message: "Erro de conexão com o servidor." });
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.cliente_email?.toLowerCase().includes(filter.toLowerCase()) ||
    log.assunto.toLowerCase().includes(filter.toLowerCase()) ||
    log.processo_id?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Mail size={24} />
            </div>
            Gerenciamento de Notificações
          </h1>
          <p className="text-slate-500 font-medium">Controle e histórico de comunicações por e-mail e AR Online.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setTab('history')}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <History size={16} /> Histórico
            </button>
            <button 
              onClick={() => setTab('manual')}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tab === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Send size={16} /> Envio Manual
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <AnimatePresence>
        {stats && tab === 'history' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Enviado</p>
                <p className="text-xl font-black text-slate-800">{stats.total}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sucesso</p>
                <p className="text-xl font-black text-slate-800">{stats.sucessos}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="bg-rose-50 p-3 rounded-2xl text-rose-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Falhas</p>
                <p className="text-xl font-black text-slate-800">{stats.erros}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-2xl text-amber-600">
                <Filter size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Taxa de Sucesso</p>
                <p className="text-xl font-black text-slate-800">
                  {stats.total > 0 ? ((stats.sucessos / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {tab === 'history' ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder="Pesquisar por e-mail, processo ou assunto..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:outline-none transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">E-mail / Cliente</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Assunto</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                      <motion.tr 
                        layout
                        key={log.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          {log.status === 'SUCESSO' ? (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                              <CheckCircle2 size={14} />
                              <span className="text-xs font-bold">Enviado</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1 rounded-full w-fit group relative">
                              <AlertCircle size={14} />
                              <span className="text-xs font-bold">Erro</span>
                              {log.erro && (
                                <div className="absolute bottom-full left-0 mb-2 invisible group-hover:visible bg-slate-800 text-white p-2 rounded-lg text-[10px] w-48 z-10 shadow-xl">
                                  {log.erro}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-700 font-bold text-sm">{log.cliente_email || 'N/A'}</span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">ID: {log.processo_id || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600 font-medium text-sm line-clamp-1">{log.assunto}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock size={14} />
                            <span className="text-xs font-medium">
                              {new Date(log.data_envio).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-medium">
                          Nenhuma notificação encontrada no histórico.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="manual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
                <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
                  <Send size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Novo E-mail Manual</h2>
                  <p className="text-slate-500 text-sm font-medium">Envie uma mensagem personalizada para qualquer destinatário.</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Utilizar Modelo Pronto</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {templates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setManualSubject(tpl.subject);
                        setManualContent(tpl.body);
                      }}
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 hover:border-indigo-200 transition-all text-center leading-tight h-full"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSendManual} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Destinatário</label>
                  <input 
                    required
                    type="email"
                    value={manualTo}
                    onChange={(e) => setManualTo(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Assunto</label>
                  <input 
                    required
                    type="text"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    placeholder="Assunto da mensagem"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo (HTML/Texto)</label>
                  <textarea 
                    required
                    rows={6}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    placeholder="Escreva sua mensagem aqui..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all placeholder:text-slate-300 font-medium resize-none"
                  />
                </div>

                {sendResult && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-2xl flex items-center gap-3 ${sendResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                  >
                    {sendResult.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold text-sm">{sendResult.message}</span>
                  </motion.div>
                )}

                <button 
                  disabled={sending}
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                >
                  {sending ? 'Enviando...' : 'Enviar Agora'}
                  {!sending && <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
