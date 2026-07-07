import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Settings, 
  Mail, 
  MessageSquare, 
  CreditCard, 
  Code, 
  Save, 
  Zap,
  Facebook,
  Globe,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../AuthContext';

interface MasterConfig {
  zapSign_token?: string;
  zapSign_redirect_url?: string;
  email_template_cliente?: string;
  wpp_template_cliente?: string;
  email_template_camara?: string;
  preco_ar_avulso?: number;
  min_qty_ar_avulso?: number;
  preco_ar_mensal?: number;
  min_qty_ar_mensal?: number;
  pixel_facebook?: string;
  pixel_tiktok?: string;
  ga_id?: string;
  quiz_youtube_url?: string;
  quiz_audio_url?: string;
  asaas_api_key?: string;
  asaas_wallet_id?: string;
}

export default function ArOnlineConfigView() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [config, setConfig] = useState<MasterConfig>({
    preco_ar_avulso: 4.97,
    min_qty_ar_avulso: 1,
    preco_ar_mensal: 4.00,
    min_qty_ar_mensal: 10,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/config/master', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/config/master', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || 'Falha ao salvar');
      }
    } catch (error: any) {
      console.error("[SAVE_ERROR]", error);
      setMessage({ type: 'error', text: `Erro ao salvar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Arquiteto de Operação AR Online</h2>
          <p className="text-slate-500">Configure APIs, Templates, Preços e Pixels de Marketing.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#0a192f] text-[#d4af37] px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {saving ? < Zap className="animate-spin" size={16} /> : <Save size={16} />}
          Salvar Alterações
        </button>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-bold">{message.text}</p>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Seção 1: APIs & Integração */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Code size={20} />
            </div>
            <h3 className="font-bold text-slate-900 uppercase tracking-tighter">Integração ZapSign / ODR</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Token de API (Assinatura Digital)</label>
            <input 
              type="password"
              value={config.zapSign_token || ''}
              onChange={e => setConfig({...config, zapSign_token: e.target.value})}
              placeholder="Paste your API Token here..."
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#d4af37]/20 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 font-medium italic">Este token autoriza o disparo de notificações com valor jurídico.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                Sua URL de Webhook (Copie para a ZapSign)
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhooks/zapsign`;
                    navigator.clipboard.writeText(url);
                    alert("URL copiada!");
                  }}
                  className="text-[#d4af37] hover:underline normal-case font-bold"
                >
                  Copiar URL
                </button>
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/webhooks/zapsign`}
                  className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Configure esta URL no Painel da ZapSign para receber notificações automáticas.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL de Redirecionamento (Pós-Assinatura)</label>
              <input 
                type="text"
                value={config.zapSign_redirect_url || ''}
                onChange={e => setConfig({...config, zapSign_redirect_url: e.target.value})}
                placeholder="https://gsa-camara.com/sucesso"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#d4af37]/20 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 font-medium italic">URL para onde o cliente será enviado automaticamente após assinar.</p>
            </div>
          </div>
        </div>

        {/* Seção Nova: Asaas Master (Plataforma) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
              <CreditCard size={20} />
            </div>
            <h3 className="font-bold text-slate-900 uppercase tracking-tighter">Gateway Asaas (Master / Plataforma)</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Token Master (X-Api-Key)</label>
              <input 
                type="password"
                value={config.asaas_api_key || ''}
                onChange={e => setConfig({...config, asaas_api_key: e.target.value})}
                placeholder="Token de produção da GSA Master..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#d4af37]/20 outline-none transition-all font-mono"
              />
              <p className="text-[10px] text-slate-400 font-medium italic">Token global da plataforma para gerenciamento de splits e taxas.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Wallet ID (Para Recebimento de Royalties)</label>
              <input 
                type="text"
                value={config.asaas_wallet_id || ''}
                onChange={e => setConfig({...config, asaas_wallet_id: e.target.value})}
                placeholder="Ex: wal_1234..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#d4af37]/20 outline-none transition-all font-mono"
              />
              <p className="text-[10px] text-slate-400 font-medium italic">ID da carteira principal para onde os royalties serão enviados.</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4">
              <p className="text-[10px] text-blue-800 font-bold uppercase tracking-widest mb-2">URL de Webhook (Global)</p>
              <code className="text-[10px] bg-white px-2 py-1 rounded block border border-blue-200 break-all">
                {`${window.location.origin}/api/webhooks/asaas`}
              </code>
              <p className="text-[9px] text-blue-600 mt-2 font-medium">Configure esta URL na sua conta Asaas para ativar conciliação automática.</p>
            </div>
          </div>
        </div>

        {/* Seção 2: Financeiro & Preços */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <CreditCard size={20} />
            </div>
            <h3 className="font-bold text-slate-900 uppercase tracking-tighter">Preços Públicos (Landing Page)</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AR Avulso (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={config.preco_ar_avulso || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, preco_ar_avulso: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[#d4af37]">Qtd Mínima Avulso</label>
                <input 
                  type="number"
                  value={config.min_qty_ar_avulso || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, min_qty_ar_avulso: isNaN(val) ? 1 : val});
                  }}
                  className="w-full bg-[#d4af37]/5 border-2 border-[#d4af37]/20 rounded-xl py-2 px-4 text-xs font-bold"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AR Mensal Base (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={config.preco_ar_mensal || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, preco_ar_mensal: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[#d4af37]">Qtd Mínima Mensal</label>
                <input 
                  type="number"
                  value={config.min_qty_ar_mensal || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, min_qty_ar_mensal: isNaN(val) ? 10 : val});
                  }}
                  className="w-full bg-[#d4af37]/5 border-2 border-[#d4af37]/20 rounded-xl py-2 px-4 text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3: Comunicação & Mensagens */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#d4af37]/20 p-2 rounded-lg text-[#d4af37]">
              <MessageSquare size={20} />
            </div>
            <h3 className="font-bold text-slate-900 uppercase tracking-tighter">Templates de Notificação (Notifique seu Cliente)</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> Mensagem de E-mail (HTML permitido)
              </label>
              <textarea 
                value={config.email_template_cliente || ''}
                onChange={e => setConfig({...config, email_template_cliente: e.target.value})}
                rows={6}
                placeholder="Ex: Olá {nome}, você tem uma nova notificação extrajudicial da Câmara GSA..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 text-sm focus:ring-2 focus:ring-[#d4af37]/20 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} /> Mensagem de WhatsApp
              </label>
              <textarea 
                value={config.wpp_template_cliente || ''}
                onChange={e => setConfig({...config, wpp_template_cliente: e.target.value})}
                rows={6}
                placeholder="Ex: Prezado(a), a Câmara GSA emitiu uma notificação em seu nome. Acesse pelo link: {link}"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 text-sm focus:ring-2 focus:ring-[#d4af37]/20 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Seção 4: Marketing & Pixels */}
        <div className="md:col-span-2 bg-slate-950 p-8 rounded-[40px] shadow-2xl border border-slate-800 space-y-8">
          <div className="flex items-center gap-3 mb-4 text-white">
            <div className="bg-[#d4af37] p-2 rounded-lg text-[#0a192f]">
              <Globe size={20} />
            </div>
            <h3 className="font-bold uppercase tracking-widest text-sm">Scripts de Rastreamento & Marketing</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Facebook size={12} className="text-blue-500" /> Facebook Pixel ID (Apenas CID)
              </label>
              <input 
                type="text"
                value={config.pixel_facebook || ''}
                onChange={e => setConfig({...config, pixel_facebook: e.target.value})}
                placeholder="Ex: 82736451928"
                className="w-full bg-white/5 border-2 border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-[#d4af37]/30 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} className="text-pink-500" /> TikTok Pixel ID
              </label>
              <input 
                type="text"
                value={config.pixel_tiktok || ''}
                onChange={e => setConfig({...config, pixel_tiktok: e.target.value})}
                placeholder="Ex: CHB2736..."
                className="w-full bg-white/5 border-2 border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-[#d4af37]/30 outline-none"
              />
            </div>
          </div>
          
          <div className="p-4 bg-[#d4af37]/10 rounded-2xl border border-[#d4af37]/20">
            <p className="text-[11px] text-[#d4af37] font-bold leading-relaxed mb-0 flex items-center gap-2 uppercase tracking-tighter">
              <ShieldCheck size={14} /> Os pixels serão injetados automaticamente na Landing Page e no Painel de Conversão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
