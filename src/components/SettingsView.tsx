import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Activity, Save, Facebook, Code, ShieldCheck, Loader2, CreditCard, Trash2, AlertTriangle, LayoutTemplate, Settings, MessageCircle, Plus, GripVertical, RefreshCw, Info, Clock, Zap, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    facebookPixel: '',
    facebookPixelId: '',
    tiktokPixel: '',
    headerScripts: '',
    footerScripts: '',
    // Comercial Site Settings
    comercialPixel: '',
    comercialHeaderScripts: '',
    comercialFooterScripts: '',
    comercialWhatsappUrl: '',
    // App Online
    onlineAppPixel: '',
    onlineAppHeaderScripts: '',
    onlineAppFooterScripts: '',
    // Payment and others
    paymentMode: 'automatic' as 'automatic' | 'manual',
    activeGateway: 'mercadopago' as 'mercadopago' | 'asaas' | 'simulado',
    pixKey: '',
    paymentLink17: '',
    paymentLink47: '',
    paymentLink297: '',
    asaasKey: '',
    mercadoPagoKey: '',
    processTypes: 'Revisional Consignado, Revisional Habitacional, Cobrança Extrajudicial',
    valorTaxaAnaliseOnline: '',
    quizQuestionsStr: '',
    welcomeEmailSubject: '',
    welcomeEmailMessage: '',
    // Audits
    auditPrompts: {} as Record<string, string>,
    // Limpa Nome
    quizYouTubeUrl: '',
    quizAudioUrl: '',
    quizAudioTitle: 'Diretor Geral Tiago Martins'
  });
  const [activeTab, setActiveTab] = useState<'landing' | 'comercial' | 'pagamentos' | 'sistema' | 'quiz' | 'online_app' | 'comunicacao' | 'diagnostico' | 'limpaNome' | 'auditoria'>('landing');
  const [health, setHealth] = useState<any>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ error: 'Falha ao conectar com o servidor' });
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diagnostico') {
      checkHealth();
    }
  }, [activeTab]);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const collectionsToClear = ['processos', 'usuarios', 'auditoria_rx', 'financeiro_transacoes'];
      let totalDeleted = 0;

      for (const colName of collectionsToClear) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        
        console.log(`Limpando ${colName}: ${snapshot.size} documentos encontrados.`);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
          batch.delete(d.ref);
          totalDeleted++;
        });
        
        if (snapshot.size > 0) {
          await batch.commit();
        }
      }

      setToast({ message: `Sistema limpo com sucesso! ${totalDeleted} registros removidos.`, type: 'success' });
      setShowResetConfirm(false);
      
      // Forçar recarregamento para recriar perfil se necessário
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error("Erro ao realizar reset de fábrica:", error);
      setToast({ message: "Erro ao limpar dados. Tente novamente.", type: 'error' });
    } finally {
      setResetting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'tracking');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.quizQuestions) {
            data.quizQuestionsStr = JSON.stringify(data.quizQuestions, null, 2);
          }
          // Fix mapping here
          setConfig(prev => ({
            ...prev,
            ...data,
            quizYouTubeUrl: data.quiz_youtube_url || data.quizYouTubeUrl || '', 
            quizAudioUrl: data.quiz_audio_url || data.quizAudioUrl || '',
            quizAudioTitle: data.quiz_audio_title || data.quizAudioTitle || 'Diretor Geral Tiago Martins'
          }));
        }
        
        // Fetch master config to get auditPrompts
        const masterRef = doc(db, 'config', 'master');
        const masterSnap = await getDoc(masterRef);
        if (masterSnap.exists()) {
          const masterData = masterSnap.data();
          if (masterData.auditPrompts) {
            setConfig(prev => ({ ...prev, auditPrompts: masterData.auditPrompts }));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    let quizQuestions = null;
    
    if (config.quizQuestionsStr) {
      try {
        quizQuestions = JSON.parse(config.quizQuestionsStr);
        if (!Array.isArray(quizQuestions)) {
           throw new Error("O JSON do Quiz não é um array válido.");
        }
      } catch (err: any) {
        setToast({ message: "Erro no JSON do Quiz: " + err.message, type: 'error' });
        setSaving(false);
        return;
      }
    }

    try {
      const docRef = doc(db, 'config', 'tracking');
      const payload: any = { ...config, updatedAt: serverTimestamp() };
      
      if (quizQuestions) {
        payload.quizQuestions = quizQuestions;
      }
      
      await setDoc(docRef, payload);
      
      // Update master config too for compatibility
      await fetch('/api/config/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quiz_youtube_url: config.quizYouTubeUrl,
            quiz_audio_url: config.quizAudioUrl,
            quiz_audio_title: config.quizAudioTitle,
            auditPrompts: config.auditPrompts
        })
      });

      setToast({ message: "Configurações salvas com sucesso!", type: 'success' });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setToast({ message: "Erro ao salvar configurações.", type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#5A5A40]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-20">
      <header>
        <h2 className="text-3xl font-serif font-bold text-gray-900">Configurações Gerais</h2>
        <p className="text-gray-500">Gerencie scripts de marketing, pagamentos e regras da plataforma.</p>
      </header>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'landing', label: 'Landing Page', icon: LayoutTemplate },
          { id: 'online_app', label: 'App Online', icon: LayoutTemplate },
          { id: 'comercial', label: 'Site Comercial', icon: LayoutTemplate },
          { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
          { id: 'quiz', label: 'Quiz Online', icon: LayoutTemplate },
          { id: 'limpaNome', label: 'Limpa Nome', icon: Zap },
          { id: 'auditoria', label: 'Auditor IA', icon: BrainCircuit },
          { id: 'comunicacao', label: 'Comunicação', icon: MessageCircle },
          { id: 'diagnostico', label: 'Saúde do Site', icon: Activity },
          { id: 'sistema', label: 'Sistema', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all",
              activeTab === tab.id 
                ? "bg-[#5A5A40] text-white shadow-lg" 
                : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 space-y-8">
          
          {/* TAB: LANDING PAGE */}
          {activeTab === 'landing' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <Facebook size={24} />
                  <h3 className="text-xl font-bold font-serif">Facebook Pixel (Landing)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Pixel ID (Somente Número)</label>
                    <input
                      type="text"
                      value={config.facebookPixelId || ''}
                      onChange={(e) => setConfig({ ...config, facebookPixelId: e.target.value })}
                      placeholder="Ex: 123456789012345"
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm bg-gray-50"
                    />
                    <p className="text-[10px] text-gray-400 italic">Insira apenas o ID numérico. O sistema gerará o script automaticamente.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Script Completo (HTML)</label>
                    <textarea
                      value={config.facebookPixel || ''}
                      onChange={(e) => setConfig({ ...config, facebookPixel: e.target.value })}
                      placeholder="<!-- Facebook Pixel Code -->"
                      className="w-full h-32 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                    />
                    <p className="text-[10px] text-gray-400 italic">Ou cole o código completo fornecido pelo Facebook aqui.</p>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <LayoutTemplate size={24} />
                  <h3 className="text-xl font-bold font-serif">TikTok Pixel (Landing)</h3>
                </div>
                <textarea
                  value={config.tiktokPixel || ''}
                  onChange={(e) => setConfig({ ...config, tiktokPixel: e.target.value })}
                  placeholder="<!-- TikTok Pixel Code -->"
                  className="w-full h-32 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                />
                <p className="text-[10px] text-gray-400 italic">Cole o código HTML completo fornecido pelo TikTok Business Center.</p>
              </section>

              <hr className="border-gray-100" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <Code size={24} />
                  <h3 className="text-xl font-bold font-serif">Scripts Adicionais (Head/Body)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Cabeçalho (Head)</label>
                    <textarea
                      value={config.headerScripts || ''}
                      onChange={(e) => setConfig({ ...config, headerScripts: e.target.value })}
                      placeholder="<script>...</script>"
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rodapé (Body)</label>
                    <textarea
                      value={config.footerScripts || ''}
                      onChange={(e) => setConfig({ ...config, footerScripts: e.target.value })}
                      placeholder="<script>...</script>"
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: ONLINE APP */}
          {activeTab === 'online_app' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <Facebook size={24} />
                  <h3 className="text-xl font-bold font-serif">Facebook Pixel (App Online)</h3>
                </div>
                <textarea
                  value={config.onlineAppPixel || ''}
                  onChange={(e) => setConfig({ ...config, onlineAppPixel: e.target.value })}
                  placeholder="<!-- Facebook Pixel Code para o App Online -->"
                  className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                />
              </section>

              <hr className="border-gray-100" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <Code size={24} />
                  <h3 className="text-xl font-bold font-serif">Scripts Adicionais (Head/Body)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Cabeçalho (Head)</label>
                    <textarea
                      value={config.onlineAppHeaderScripts || ''}
                      onChange={(e) => setConfig({ ...config, onlineAppHeaderScripts: e.target.value })}
                      placeholder="<script>...</script>"
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rodapé (Body)</label>
                    <textarea
                      value={config.onlineAppFooterScripts || ''}
                      onChange={(e) => setConfig({ ...config, onlineAppFooterScripts: e.target.value })}
                      placeholder="<script>...</script>"
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-xs bg-gray-50"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: SITE COMERCIAL */}
          {activeTab === 'comercial' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#7a0f1a]">
                  <MessageCircle size={24} />
                  <h3 className="text-xl font-bold font-serif">Link de Direcionamento (Botões)</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Insira o link oficial do WhatsApp ou formulário que os botões do Site Comercial devem abrir.
                </p>
                <input
                  type="url"
                  value={config.comercialWhatsappUrl || ''}
                  onChange={(e) => setConfig({ ...config, comercialWhatsappUrl: e.target.value })}
                  placeholder="https://wa.me/55..."
                  className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#7a0f1a] transition-all"
                />
              </section>

              <hr className="border-gray-100" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#7a0f1a]">
                  <Facebook size={24} />
                  <h3 className="text-xl font-bold font-serif">Facebook Pixel (Site Comercial)</h3>
                </div>
                <textarea
                  value={config.comercialPixel || ''}
                  onChange={(e) => setConfig({ ...config, comercialPixel: e.target.value })}
                  placeholder="<!-- Facebook Pixel Code para o Site Comercial -->"
                  className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#7a0f1a] font-mono text-xs bg-gray-50"
                />
              </section>

              <hr className="border-gray-100" />

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#7a0f1a]">
                  <Code size={24} />
                  <h3 className="text-xl font-bold font-serif">Scripts Adicionais (Site Comercial)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Cabeçalho (Head)</label>
                    <textarea
                      value={config.comercialHeaderScripts || ''}
                      onChange={(e) => setConfig({ ...config, comercialHeaderScripts: e.target.value })}
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#7a0f1a] font-mono text-xs bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rodapé (Body)</label>
                    <textarea
                      value={config.comercialFooterScripts || ''}
                      onChange={(e) => setConfig({ ...config, comercialFooterScripts: e.target.value })}
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#7a0f1a] font-mono text-xs bg-gray-50"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: PAGAMENTOS */}
          {activeTab === 'pagamentos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <CreditCard size={24} />
                  <h3 className="text-xl font-bold font-serif">Modo de Pagamento (Landing Page)</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Defina se o pagamento na Landing Page será processado automaticamente via API ou se será manual (com botão de aviso ao consultor).
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setConfig({ ...config, paymentMode: 'automatic' })}
                    className={cn(
                      "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      config.paymentMode === 'automatic' 
                        ? "border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40]" 
                        : "border-gray-100 hover:border-gray-200 text-gray-400"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                      config.paymentMode === 'automatic' ? "border-[#5A5A40]" : "border-gray-300"
                    )}>
                      {config.paymentMode === 'automatic' && <div className="w-3 h-3 bg-[#5A5A40] rounded-full" />}
                    </div>
                    <span className="font-bold">Automático (API Pix)</span>
                  </button>

                  <button
                    onClick={() => setConfig({ ...config, paymentMode: 'manual' })}
                    className={cn(
                      "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      config.paymentMode === 'manual' 
                        ? "border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40]" 
                        : "border-gray-100 hover:border-gray-200 text-gray-400"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                      config.paymentMode === 'manual' ? "border-[#5A5A40]" : "border-gray-300"
                    )}>
                      {config.paymentMode === 'manual' && <div className="w-3 h-3 bg-[#5A5A40] rounded-full" />}
                    </div>
                    <span className="font-bold">Manual (Avisar Consultor)</span>
                  </button>
                </div>

                {config.paymentMode === 'manual' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 space-y-4"
                  >
                    <label className="block text-sm font-bold text-gray-700">Chave Pix para Recebimento Manual</label>
                    <input
                      type="text"
                      value={config.pixKey || ''}
                      onChange={(e) => setConfig({ ...config, pixKey: e.target.value })}
                      placeholder="Ex: CNPJ, E-mail ou Chave Aleatória"
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 italic">
                      Esta chave será exibida ao cliente no checkout manual.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 text-[10px] uppercase">R$ 17,00</label>
                        <input
                          type="url"
                          value={config.paymentLink17 || ''}
                          onChange={(e) => setConfig({ ...config, paymentLink17: e.target.value })}
                          placeholder="https://..."
                          className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 text-[10px] uppercase">R$ 47,00</label>
                        <input
                          type="url"
                          value={config.paymentLink47 || ''}
                          onChange={(e) => setConfig({ ...config, paymentLink47: e.target.value })}
                          placeholder="https://..."
                          className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 text-[10px] uppercase">R$ 297,00</label>
                        <input
                          type="url"
                          value={config.paymentLink297 || ''}
                          onChange={(e) => setConfig({ ...config, paymentLink297: e.target.value })}
                          placeholder="https://..."
                          className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-xs"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {config.paymentMode === 'automatic' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700">Gateway Ativo</label>
                      <div className="flex gap-4">
                        {['mercadopago', 'asaas', 'simulado'].map(gw => (
                          <button
                            key={gw}
                            onClick={() => setConfig({ ...config, activeGateway: gw as any })}
                            className={cn(
                              "flex-1 p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider",
                              config.activeGateway === gw
                                ? "border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40]"
                                : "border-gray-100 text-gray-400 font-normal"
                            )}
                          >
                            {gw}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">API Key Asaas</label>
                        <input
                          type="password"
                          value={config.asaasKey || ''}
                          onChange={(e) => setConfig({ ...config, asaasKey: e.target.value })}
                          placeholder="$aach_..."
                          className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Access Token Mercado Pago</label>
                        <input
                          type="password"
                          value={config.mercadoPagoKey || ''}
                          onChange={(e) => setConfig({ ...config, mercadoPagoKey: e.target.value })}
                          placeholder="APP_USR-..."
                          className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-[#5A5A40]/5 rounded-2xl border border-[#5A5A40]/10">
                      <h4 className="font-bold text-[#5A5A40] text-sm flex items-center gap-2">
                        <Code size={16} /> URLs de Webhooks
                      </h4>
                      <div className="space-y-3">
                        {['mercadopago', 'asaas'].map(type => (
                          <div key={type}>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{type} Webhook</p>
                            <div className="flex gap-2">
                              <input readOnly value={`${window.location.origin}/api/webhooks/${type}`} className="flex-1 p-2 bg-white rounded-lg border border-gray-200 text-xs font-mono" />
                              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/${type}`); alert("Copiado!"); }} className="px-3 py-1 bg-[#5A5A40] text-white rounded-lg text-xs font-bold">Copiar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </section>
            </motion.div>
          )}

          {/* TAB: QUIZ ONLINE */}
          {activeTab === 'quiz' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <LayoutTemplate size={24} />
                  <h3 className="text-xl font-bold font-serif">Ajustes do Quiz de Viabilidade Jurídica</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Crie e edite as questões do Quiz. Cada questão deve ter um <strong>Identificador (key)</strong> único, como <code>tipo</code> ou <code>tempo</code>, que será usado para montar o resumo da análise.
                </p>
                {(() => {
                  let questions: any[] = [];
                  try {
                    if (config.quizQuestionsStr) {
                      questions = JSON.parse(config.quizQuestionsStr);
                      if (!Array.isArray(questions)) questions = [];
                    }
                  } catch (e) {
                    questions = [];
                  }

                  const updateQuestions = (newQ: any[]) => {
                    setConfig({ ...config, quizQuestionsStr: JSON.stringify(newQ, null, 2) });
                  };

                  return (
                    <div className="space-y-6">
                      {questions.map((q, qIndex) => {
                        if (!q) return null;
                        return (
                          <div key={qIndex} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative pt-12">
                            <div className="absolute top-0 left-0 w-full h-8 bg-gray-50 rounded-t-2xl border-b border-gray-100 flex items-center justify-between px-4">
                              <span className="text-xs font-bold text-gray-400">Questão {qIndex + 1}</span>
                              <button onClick={() => {
                                const newQ = [...questions];
                                newQ.splice(qIndex, 1);
                                updateQuestions(newQ);
                              }} className="text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 mt-2">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Pergunta Principal</label>
                                <input 
                                  value={q.pergunta || ''}
                                  onChange={e => {
                                    const newQ = [...questions];
                                    newQ[qIndex].pergunta = e.target.value;
                                    updateQuestions(newQ);
                                  }}
                                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm"
                                  placeholder="Qual a sua situação de inadimplência?"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Identificador Interno (key)</label>
                                <input 
                                  value={q.key || ''}
                                  onChange={e => {
                                    const newQ = [...questions];
                                    newQ[qIndex].key = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                    updateQuestions(newQ);
                                  }}
                                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] font-mono text-sm text-gray-600"
                                  placeholder="ex: situacao"
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                Opções de Resposta
                              </label>
                              
                              {(!q.opcoes || q.opcoes.length === 0) && (
                                <p className="text-xs text-gray-400 italic">Nenhuma opção cadastrada. Adicione opções para o usuário escolher.</p>
                              )}

                              {Array.isArray(q.opcoes) && q.opcoes.map((op: any, oIndex: number) => {
                                if (!op) return null;
                                return (
                                  <div key={oIndex} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-gray-50/50 p-2 sm:p-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                                    <GripVertical size={16} className="text-gray-300 hidden sm:block" />
                                    <div className="flex-1 w-full relative">
                                      <span className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold text-gray-400 uppercase rounded">Texto do Botão</span>
                                      <input 
                                        value={op.label || ''}
                                        onChange={e => {
                                          const newQ = [...questions];
                                          newQ[qIndex].opcoes[oIndex].label = e.target.value;
                                          updateQuestions(newQ);
                                        }}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40]"
                                        placeholder="Sim / Não / Opção A"
                                      />
                                    </div>
                                    <div className="w-full sm:w-1/3 relative">
                                      <span className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold text-gray-400 uppercase rounded">Variável Salva</span>
                                      <input 
                                        value={op.value || ''}
                                        onChange={e => {
                                          const newQ = [...questions];
                                          newQ[qIndex].opcoes[oIndex].value = e.target.value;
                                          updateQuestions(newQ);
                                        }}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 font-mono text-sm text-gray-600 focus:ring-2 focus:ring-[#5A5A40]"
                                        placeholder="valor_salvo"
                                      />
                                    </div>
                                    <div className="flex w-full sm:w-auto items-center gap-2">
                                      <div className="w-full sm:w-24 relative">
                                        <span className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold text-gray-400 uppercase rounded">Score</span>
                                        <input 
                                          type="number"
                                          value={op.points ?? 0}
                                          onChange={e => {
                                            const newQ = [...questions];
                                            newQ[qIndex].opcoes[oIndex].points = Number(e.target.value);
                                            updateQuestions(newQ);
                                          }}
                                          className="w-full p-2.5 rounded-lg border border-gray-200 font-mono text-sm focus:ring-2 focus:ring-[#5A5A40]"
                                          placeholder="0"
                                        />
                                      </div>
                                      <button onClick={() => {
                                        const newQ = [...questions];
                                        newQ[qIndex].opcoes.splice(oIndex, 1);
                                        updateQuestions(newQ);
                                      }} className="text-gray-400 hover:text-red-500 p-2 transition-colors mt-2 sm:mt-0">
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              <button onClick={() => {
                                const newQ = [...questions];
                                if (!Array.isArray(newQ[qIndex].opcoes)) {
                                  newQ[qIndex].opcoes = [];
                                }
                                newQ[qIndex].opcoes.push({ label: '', value: '', points: 0 });
                                updateQuestions(newQ);
                              }} className="text-sm font-bold text-[#5A5A40] flex items-center gap-2 mt-4 hover:bg-[#5A5A40]/10 px-4 py-2 rounded-lg transition-colors w-fit">
                                <Plus size={16} /> Adicionar Nova Alternativa
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <button 
                        onClick={() => {
                          const newQ = [...questions];
                          newQ.push({ key: '', pergunta: '', opcoes: [{label: '', value: '', points: 0}] });
                          updateQuestions(newQ);
                        }}
                        className="w-full py-6 border-2 border-dashed border-[#5A5A40]/30 rounded-2xl text-[#5A5A40] font-bold hover:bg-[#5A5A40] hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={20} /> Adicionar Nova Pergunta ao Quiz
                      </button>

                      {/* Optional Advanced View */}
                      <details className="mt-8 text-xs text-gray-400 cursor-pointer">
                        <summary className="font-bold hover:text-gray-600 transition-colors">Visualizar JSON Avançado</summary>
                        <textarea
                          readOnly
                          value={config.quizQuestionsStr}
                          className="w-full h-48 mt-4 p-4 rounded-xl border border-gray-200 font-mono text-[10px] bg-gray-50"
                        />
                      </details>
                    </div>
                  );
                })()}
              </section>
            </motion.div>
          )}

          {/* TAB: LIMPA NOME */}
          {activeTab === 'limpaNome' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <Zap size={24} />
                  <h3 className="text-xl font-bold font-serif">Configurações Limpa Nome</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">URL do Vídeo YouTube</label>
                    <input 
                      type="text"
                      value={config.quizYouTubeUrl || ''}
                      onChange={e => setConfig({...config, quizYouTubeUrl: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Arquivo de Áudio</label>
                    <input 
                      type="file"
                      accept="audio/*"
                      onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('audio', file);
                          try {
                            const res = await fetch('/api/uploads/upload-audio', {
                              method: 'POST',
                              body: formData
                            });
                            const data = await res.json();
                            if(data.success) {
                              setConfig({...config, quizAudioUrl: data.filename});
                              setToast({ message: "Áudio enviado com sucesso!", type: 'success' });
                            }
                          } catch (e) {
                              setToast({ message: "Erro ao enviar áudio", type: 'error' });
                          }
                      }}
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]"
                    />
                    <p className="text-[10px] text-gray-400 italic">O arquivo será armazenado no sistema.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Título do Áudio</label>
                    <input 
                      type="text"
                      value={config.quizAudioTitle || ''}
                      onChange={e => setConfig({...config, quizAudioTitle: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: COMUNICACAO */}
          {activeTab === 'comunicacao' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <MessageCircle size={24} />
                  <h3 className="text-xl font-bold font-serif">E-mail de Boas-vindas (Leads)</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Configure a mensagem automática enviada aos novos leads capturados via Quiz.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Assunto do E-mail</label>
                    <input 
                      type="text"
                      value={config.welcomeEmailSubject || ''}
                      onChange={(e) => setConfig({ ...config, welcomeEmailSubject: e.target.value })}
                      placeholder="Ex: Seja bem-vindo à GSA Câmara"
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Mensagem (Corpo do E-mail)</label>
                    <textarea 
                      value={config.welcomeEmailMessage || ''}
                      onChange={(e) => setConfig({ ...config, welcomeEmailMessage: e.target.value })}
                      placeholder="Seja bem-vindo..."
                      className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm"
                    />
                    <p className="text-[10px] text-gray-400">Dica: Use parágrafos simples. O assunto será personalizado com o nome do cliente automaticamente.</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: DIAGNOSTICO / SAUDE */}
          {activeTab === 'diagnostico' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-indigo-600">
                    <Activity size={24} />
                    <h3 className="text-xl font-bold font-serif">Status do Sistema em Tempo Real</h3>
                  </div>
                  <button 
                    onClick={checkHealth} 
                    disabled={checkingHealth}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline"
                  >
                    <RefreshCw size={14} className={checkingHealth ? 'animate-spin' : ''} />
                    Atualizar Status
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={cn(
                    "p-6 rounded-2xl border-2 flex items-center gap-4",
                    health?.db === "online" ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                  )}>
                    <div className={cn("p-3 rounded-xl", health?.db === "online" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Banco de Dados (Firestore)</p>
                      <p className="text-lg font-black">{health?.db === "online" ? "ONLINE" : "OFFLINE OU ERRO"}</p>
                      {health?.db !== "online" && <p className="text-[10px] mt-1 text-red-600 font-bold">{health?.db || 'Sem conexão'}</p>}
                    </div>
                  </div>

                  <div className={cn(
                    "p-6 rounded-2xl border-2 flex items-center gap-4",
                    health?.gemini?.includes("ready") ? "bg-indigo-50 border-indigo-100" : "bg-amber-50 border-amber-100"
                  )}>
                    <div className={cn("p-3 rounded-xl", health?.gemini?.includes("ready") ? "bg-indigo-500 text-white" : "bg-amber-500 text-white")}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">IA Gemini Status</p>
                      <p className="text-lg font-black">{health?.gemini?.includes("ready") ? "PRONTO" : "RESTRITO"}</p>
                      <p className="text-[10px] mt-1 text-indigo-600 font-bold">{health?.gemini || 'Verificando...'}</p>
                    </div>
                  </div>

                  <div className={cn(
                    "p-6 rounded-2xl border-2 flex items-center gap-4",
                    health?.cronSecretLoaded ? "bg-purple-50 border-purple-100" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className={cn("p-3 rounded-xl", health?.cronSecretLoaded ? "bg-purple-500 text-white" : "bg-slate-500 text-white")}>
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Cron Secret (Ambiente)</p>
                      <p className="text-lg font-black">{health?.cronSecretLoaded ? "CONFIGURADO" : "NÃO CONFIGURADO"}</p>
                      <p className="text-[10px] mt-1 text-slate-500 font-bold">
                        {health?.cronSecretHint ? `Dica: ${health.cronSecretHint}` : "Variável CRON_SECRET ausente"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="bg-slate-800 p-3 rounded-xl text-white">
                      <Code size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Servidor Node.js</p>
                      <p className="text-lg font-black">{health?.status === "ok" ? "OPERACIONAL" : "INSTÁVEL"}</p>
                      <p className="text-[10px] mt-1 text-slate-500 font-bold">V 1.0.4 - LIVE</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-4">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={18} /> Resolvendo "Rate exceeded" (Erro 429)
                  </h4>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Se você está vendo esta mensagem no site, é provável que a cota da <strong>Inteligência Artificial (Gemini)</strong> tenha sido excedida temporariamente no plano gratuito. 
                  </p>
                  <ul className="text-xs text-amber-700 space-y-2 list-disc ml-5 font-medium">
                    <li>O sistema mudou automaticamente para o modelo <strong>gemini-3.5-flash</strong> (mais rápido e com maior limite).</li>
                    <li>Evite realizar muitas análises sequenciais em menos de 1 minuto.</li>
                    <li>Sua site continuará online, mas a análise detalhada pode usar um "fallback" técnico se a IA estiver em cooldown.</li>
                  </ul>
                </div>
              </section>

              <hr className="border-gray-100" />

              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Clock size={24} />
                  <h3 className="text-xl font-bold font-serif">Configuração do Google Cloud Scheduler (Cron)</h3>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Para que os follow-ups automáticos funcionem, siga estes passos no Google Cloud Console:</p>
                  
                  <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 space-y-4 text-sm font-light">
                    <div className="flex gap-4">
                      <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs">1</div>
                      <p>Vá em <strong>Cloud Scheduler</strong> e clique em <strong>Criar Job</strong>.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs">2</div>
                      <p>Defina a frequência (ex: <code>0 9 * * *</code> para todo dia às 9h) e a localização.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs">3</div>
                      <div>
                        <p className="mb-2">Configure o <strong>Target</strong>:</p>
                        <ul className="ml-4 list-disc space-y-1 text-xs opacity-80">
                          <li>URL: <code>{window.location.origin}/api/cron/follow-up-avancado</code></li>
                          <li>HTTP Method: <code>GET</code></li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs">4</div>
                      <div>
                        <p className="mb-2">Adicione o <strong>Cabeçalho de Autenticação</strong>:</p>
                        <ul className="ml-4 list-disc space-y-1 text-xs opacity-80">
                          <li>Name: <code>X-Cron-Secret</code></li>
                          <li>Value: (O segredo que você definiu na variável <code>CRON_SECRET</code>)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <Info size={18} className="text-indigo-600" />
                    <p className="text-xs text-indigo-800 font-medium italic">
                      Dica: Você pode testar clicando em "Force Run" no Cloud Console após criar o Job.
                    </p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: AUDITORIA IA */}
          {activeTab === 'auditoria' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-6">
                <header>
                    <div className="flex items-center gap-3 text-orange-600 mb-2">
                      <BrainCircuit size={28} />
                      <h3 className="text-xl font-bold font-serif">Diretrizes Globais - Auditor IA</h3>
                    </div>
                    <p className="text-sm text-gray-500">
                        Defina instruções padronizadas para cada tipo de auditoria do RX. Essas instruções são fixadas no prompt da IA para todos os usuários.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['CONTRATOS', 'INSS', 'TRABALHISTA', 'CONFLITOS', 'FAMILIA', 'TRANSITO', 'SEGURO'].map(type => (
                        <div key={type} className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{type}</label>
                            <textarea
                                value={config.auditPrompts?.[type] || ''}
                                onChange={e => setConfig(prev => ({
                                    ...prev, 
                                    auditPrompts: {
                                        ...(prev.auditPrompts || {}),
                                        [type]: e.target.value
                                    }
                                }))}
                                placeholder={`Instruções customizadas para ${type}...`}
                                className="w-full h-32 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 font-mono text-xs bg-gray-50 text-gray-700 resize-none"
                            />
                        </div>
                    ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB: SISTEMA */}
          {activeTab === 'sistema' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <ShieldCheck size={24} />
                  <h3 className="text-xl font-bold font-serif">Processos e Taxas</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Tipos de Processos Aceitos</label>
                    <textarea
                      value={config.processTypes || ''}
                      onChange={(e) => setConfig({ ...config, processTypes: e.target.value })}
                      placeholder="Ex: Ação Revisional, Indenizatória, Contratual..."
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm bg-gray-50"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Taxa de Abertura de Análise Online (R$)</label>
                    <input
                      type="number"
                      value={config.valorTaxaAnaliseOnline || ''}
                      onChange={(e) => setConfig({ ...config, valorTaxaAnaliseOnline: e.target.value })}
                      placeholder="Ex: 47"
                      className="w-full max-w-xs p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] text-sm bg-gray-50"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#5A5A40] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4A4A30] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Salvar Configurações
          </button>
        </div>
      </div>

      {/* Reset de Fábrica */}
      <div className="bg-red-50 rounded-3xl p-8 border border-red-100 space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <Trash2 size={24} />
          <h3 className="text-xl font-bold font-serif">Limpeza de Dados (Reset de Fábrica)</h3>
        </div>
        <p className="text-sm text-red-700/70">
          Esta ação irá apagar permanentemente todos os processos, usuários, auditorias e transações financeiras. 
          Use isso apenas para iniciar o sistema do zero para uso oficial. 
          <span className="font-bold underline ml-1">Suas chaves de API do Mercado Pago e Asaas NÃO serão apagadas.</span>
        </p>
        
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
          >
            Começar Limpeza Total
          </button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col sm:flex-row items-center gap-4 bg-white p-6 rounded-2xl border-2 border-red-500 shadow-xl"
          >
            <div className="flex-1">
              <p className="text-red-700 font-bold mb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> Você tem certeza absoluta?
              </p>
              <p className="text-xs text-red-600/70">Isso não pode ser desfeito. Todos os dados serão perdidos.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-100"
              >
                {resetting ? <Loader2 className="animate-spin" size={18} /> : null}
                Confirmar Limpeza Total
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={cn(
            "fixed bottom-8 right-8 px-8 py-4 rounded-[2rem] shadow-2xl text-white font-bold z-[100] flex items-center gap-3 border shadow-green-500/20",
            toast.type === 'success' ? "bg-green-600 border-green-500" : "bg-red-600 border-red-500"
          )}
        >
          {toast.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          <div className="flex flex-col">
            <span className="text-sm">{toast.message}</span>
            {toast.type === 'success' && <span className="text-[10px] opacity-75 font-normal">As alterações já estão em vigor.</span>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
