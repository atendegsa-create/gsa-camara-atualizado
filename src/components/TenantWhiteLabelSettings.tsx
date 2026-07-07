import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Palette, Image as ImageIcon, Save, Phone, Mail, CheckCircle2, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TenantWhiteLabelSettings: React.FC = () => {
  const { profile, tenant, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState('');

  // Inicializa o estado com as configurações atuais da unidade
  const [config, setConfig] = useState({
    primaryColor: '#1e3a8a',
    secondaryColor: '#2563eb',
    logoUrl: '',
    emailContato: '',
    whatsappContato: '',
    nomeAssinatura: ''
  });

  const [financeiro, setFinanceiro] = useState({
    asaasWalletId: ''
  });

  useEffect(() => {
    if (tenant?.white_label) {
      setConfig({
        primaryColor: tenant.white_label.primaryColor || '#1e3a8a',
        secondaryColor: tenant.white_label.secondaryColor || '#2563eb',
        logoUrl: tenant.white_label.logoUrl || '',
        emailContato: tenant.white_label.emailContato || '',
        whatsappContato: tenant.white_label.whatsappContato || '',
        nomeAssinatura: tenant.white_label.nomeAssinatura || tenant.nome_unidade || ''
      });
    }

    if (tenant?.financeiro) {
      setFinanceiro({
        asaasWalletId: tenant.financeiro.asaasWalletId || ''
      });
    }
  }, [tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleFinanceiroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFinanceiro(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.tenantId) {
      alert("Erro: O utilizador não está vinculado a nenhuma unidade.");
      return;
    }

    setLoading(true);
    setSucesso('');

    try {
      const tenantRef = doc(db, 'tenants', profile.tenantId);
      
      // Atualização segura: Altera o white_label e APENAS a WalletID dentro de financeiro,
      // preservando as taxas e regras de comissão definidas pelo MasterAdmin.
      await updateDoc(tenantRef, {
        white_label: config,
        'financeiro.asaasWalletId': financeiro.asaasWalletId
      });

      // Atualiza as variáveis CSS da página imediatamente para dar o efeito "Uau"
      document.documentElement.style.setProperty('--brand-primary', config.primaryColor);

      setSucesso('Configurações atualizadas com sucesso! As alterações já estão online.');
      await refreshProfile(); // Recarrega o contexto atual
      
      setTimeout(() => setSucesso(''), 5000);
    } catch (error) {
      console.error("Erro ao atualizar White-Label:", error);
      alert("Falha ao salvar. Verifique se tem permissões de gestor desta unidade.");
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">A carregar configurações da unidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 p-8 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Palette className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Personalização da Unidade</h2>
              <p className="text-sm text-gray-500 font-medium">Adapte o sistema com a identidade visual e dados de contacto da sua câmara.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-10 font-sans">
          <AnimatePresence>
            {sucesso && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-green-50 border border-green-100 text-green-700 p-6 rounded-2xl flex items-center gap-4 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="font-bold">Sistema Atualizado!</p>
                  <p className="text-sm opacity-90">{sucesso}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* CORES */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cores do Sistema</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Cor Primária</label>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <input 
                      type="color" 
                      name="primaryColor"
                      value={config.primaryColor}
                      onChange={handleChange}
                      className="h-14 w-20 cursor-pointer rounded-2xl border-2 border-gray-100 bg-white p-1 transition-transform active:scale-95"
                    />
                  </div>
                  <input 
                    type="text" 
                    name="primaryColor"
                    value={config.primaryColor.toUpperCase()}
                    onChange={handleChange}
                    className="flex-1 px-6 py-4 border-2 border-gray-50 rounded-2xl focus:border-primary focus:ring-0 outline-none bg-gray-50/50 transition-all font-mono font-bold text-gray-700"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 ml-4 font-medium italic">Afeta botões, cabeçalhos e elementos principais.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Cor Secundária</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    name="secondaryColor"
                    value={config.secondaryColor}
                    onChange={handleChange}
                    className="h-14 w-20 cursor-pointer rounded-2xl border-2 border-gray-100 bg-white p-1 transition-transform active:scale-95"
                  />
                  <input 
                    type="text" 
                    name="secondaryColor"
                    value={config.secondaryColor.toUpperCase()}
                    onChange={handleChange}
                    className="flex-1 px-6 py-4 border-2 border-gray-50 rounded-2xl focus:border-primary focus:ring-0 outline-none bg-gray-50/50 transition-all font-mono font-bold text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LOGO */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logomarca da Unidade</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> URL do Logotipo
                </label>
                <input 
                  type="url" 
                  name="logoUrl"
                  value={config.logoUrl}
                  onChange={handleChange}
                  placeholder="https://exemplo.com/logo-unidade.png"
                  className="w-full px-6 py-4 border-2 border-gray-50 rounded-2xl focus:border-primary focus:ring-0 outline-none bg-gray-50/50 transition-all font-medium text-gray-700"
                />
              </div>
              
              {config.logoUrl && (
                <div className="mt-4 p-6 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50 flex flex-col items-center gap-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pré-visualização do Topo</span>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 max-w-[200px]">
                    <img src={config.logoUrl} alt="Logo Preview" className="h-12 w-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CONTACTOS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dados de Comunicação (IA & Docs)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> WhatsApp Oficial
                </label>
                <input 
                  type="text" 
                  name="whatsappContato"
                  value={config.whatsappContato}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="w-full px-6 py-4 border-2 border-gray-50 rounded-2xl focus:border-primary focus:ring-0 outline-none bg-gray-50/50 transition-all font-medium text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> E-mail Institucional
                </label>
                <input 
                  type="email" 
                  name="emailContato"
                  value={config.emailContato}
                  onChange={handleChange}
                  placeholder="contato@unidade.com"
                  className="w-full px-6 py-4 border-2 border-gray-50 rounded-2xl focus:border-primary focus:ring-0 outline-none bg-gray-50/50 transition-all font-medium text-gray-700"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 ml-4 font-medium italic">
              * Estes dados serão usados pela nossa IA para redigir notificações e documentos oficiais da sua unidade.
            </p>
          </div>

          {/* FINANCEIRO (APENAS WALLET) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recebimento de Honorários (Asaas)</span>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-primary" /> ID da Carteira (Wallet ID)
              </label>
              <input 
                type="text" 
                name="asaasWalletId"
                value={financeiro.asaasWalletId}
                onChange={handleFinanceiroChange}
                placeholder="Ex: wal_XXXXXXXXXXXX"
                className="w-full px-6 py-4 border-2 border-gray-50 rounded-2xl focus:border-primary focus:ring-0 outline-none bg-gray-50/50 transition-all font-mono text-sm text-gray-700"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 ml-4 font-medium italic">
              * Insira o ID da sua conta Asaas para receber automaticamente as suas comissões em cada pagamento aprovado no sistema.
            </p>
          </div>

          <div className="pt-10 border-t border-gray-50 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-5 bg-primary text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-black transition-all active:scale-[0.95] shadow-xl shadow-primary/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={22} />
                  <span>Salvar & Aplicar Agora</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
