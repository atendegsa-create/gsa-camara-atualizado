import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Loader2, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

export function PublicTrackingView() {
  const [searchType, setSearchType] = useState<'protocol' | 'cpf'>('protocol');
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    setIsSearching(true);
    setResult(null);
    setError(null);

    try {
      const field = searchType === 'protocol' ? 'nup' : 'cliente_documento';
      const cleanInput = searchType === 'cpf' ? inputValue.replace(/\D/g, '') : inputValue.trim();
      
      const q = query(collection(db, 'consulta_publica'), where(field, '==', searchType === 'cpf' ? cleanInput : inputValue.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Fallback: search in leads
        let leadsQ;
        if (searchType === 'cpf') {
            leadsQ = query(collection(db, 'leads'), where('cpf', '==', cleanInput));
        } else {
            // Protocol search in leads: maybe input is the exact LEAD-xxx ID
            // or just ignore if it's protocol
        }

        if (leadsQ) {
            const leadsSnapshot = await getDocs(leadsQ);
            if (!leadsSnapshot.empty) {
                const leadDoc = leadsSnapshot.docs[0];
                const lead = leadDoc.data() as any;
                const isPaid = ['EM_ANALISE', 'NEGOCIACAO', 'FINALIZADO', 'PAGO'].includes(lead.status) || ['APPROVED', 'PAGO'].includes(lead.paymentStatus);
                setResult({
                    nup: `LEAD-${leadDoc.id.substring(0,6).toUpperCase()}`,
                    status: isPaid ? 'PAGAMENTO_REALIZADO' : 'AGUARDANDO_TAP',
                    tipo_acao: lead.tipo || 'Análise de Viabilidade',
                    logs: lead.logs || [
                        { status: 'LEAD_RECEBIDO', data: lead.createdAt || new Date().toISOString() },
                    ],
                    checkoutUrl: lead.checkoutUrl || null,
                    isLead: true
                });
                return;
            }
        }
        
        // Also allow searching by Email in leads if input contains '@'
        if (inputValue.includes('@')) {
            const emailQ = query(collection(db, 'leads'), where('email', '==', inputValue.trim().toLowerCase()));
            const emailSnap = await getDocs(emailQ);
            if (!emailSnap.empty) {
                const leadDoc = emailSnap.docs[0];
                const lead = leadDoc.data() as any;
                const isPaid = ['EM_ANALISE', 'NEGOCIACAO', 'FINALIZADO', 'PAGO'].includes(lead.status) || ['APPROVED', 'PAGO'].includes(lead.paymentStatus);
                setResult({
                    nup: `LEAD-${leadDoc.id.substring(0,6).toUpperCase()}`,
                    status: isPaid ? 'PAGAMENTO_REALIZADO' : 'AGUARDANDO_TAP',
                    tipo_acao: lead.tipo || 'Análise de Viabilidade',
                    logs: lead.logs || [
                        { status: 'LEAD_RECEBIDO', data: lead.createdAt || new Date().toISOString() },
                    ],
                    checkoutUrl: lead.checkoutUrl || null,
                    isLead: true
                });
                return;
            }
        }

        setError('Nenhum pedido encontrado com esses dados. Verifique e tente novamente.');
      } else {
        // Pega o processo mais recente
        const process = querySnapshot.docs[0].data();
        setResult(process);
      }
    } catch (err: any) {
      console.error("Erro na consulta pública:", err);
      setError('Ocorreu um erro ao consultar. Tente novamente mais tarde.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LEAD_NOVO': return 'text-blue-600 bg-blue-50';
      case 'AGUARDANDO_TAP': return 'text-amber-600 bg-amber-50';
      case 'PEDIDO_SOLICITADO':
      case 'PAGAMENTO_REALIZADO':
      case 'TRIAGEM':
      case 'NOTIFICACAO':
        return 'text-green-600 bg-green-50';
      case 'EM_ANDAMENTO': return 'text-purple-600 bg-purple-50';
      case 'CONCLUIDO': return 'text-green-700 bg-green-100';
      case 'CANCELADO': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-100 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="text-blue-600 w-8 h-8" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Consulta Pública</h2>
          <p className="text-gray-500">Acompanhe o status do seu pedido GSA em tempo real.</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-6">
          <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => { setSearchType('protocol'); setInputValue(''); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                searchType === 'protocol' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Protocolo (NUP)
            </button>
            <button
              type="button"
              onClick={() => { setSearchType('cpf'); setInputValue(''); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                searchType === 'cpf' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Documento (CPF)
            </button>
          </div>

          <div>
            <input 
              type="text"
              placeholder={searchType === 'protocol' ? "Ex: GSA-123456789" : "000.000.000-00"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 text-lg font-medium text-center"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isSearching || !inputValue}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            Consultar Situação
          </button>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 bg-gray-50 rounded-3xl border border-gray-100 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status Atual</p>
                <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase", getStatusColor(result.status))}>
                  {result.status.includes('PAGAMENTO') ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                  {getStatusLabel(result.status)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Protocolo</p>
                <p className="text-sm font-mono font-bold text-gray-900">{result.nup}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                  <FileText className="text-gray-400" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Serviço Solicitado</p>
                  <p className="text-sm font-bold text-gray-900">{result.tipo_acao}</p>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Linha do Tempo</p>
                <div className="space-y-4">
                  {(result.logs || []).slice(-3).reverse().map((log: any, i: number) => (
                    <div key={i} className="flex gap-3 relative">
                      {i !== (result.logs?.length || 0) - 1 && <div className="absolute left-1.5 top-3 bottom-0 w-0.5 bg-gray-100" />}
                      <div className={cn("w-3 h-3 rounded-full mt-1.5 shrink-0", i === 0 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-gray-200")} />
                      <div>
                        <p className="text-xs font-bold text-gray-800">{getStatusLabel(log.status)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(log.data).toLocaleDateString()} às {new Date(log.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {['LEAD_NOVO', 'AGUARDANDO_TAP', 'ANALISADO'].includes(result.status) ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-800 flex flex-col gap-3">
                <p className="font-bold flex items-center gap-2"><AlertCircle size={16}/> Pendência Financeira Identificada</p>
                <p>O pagamento do seu pedido ainda não foi processado em nosso sistema. Para prosseguir com o seu caso, certifique-se de que a taxa de serviço foi paga.</p>
                {result.checkoutUrl && result.checkoutUrl !== '#' && (
                  <button
                    onClick={() => window.open(result.checkoutUrl, '_blank')}
                    className="mt-2 bg-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-amber-700 transition flex items-center justify-center font-sans tracking-wide"
                  >
                    Efetuar Pagamento
                  </button>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
