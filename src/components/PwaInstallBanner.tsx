import React, { useState, useEffect } from 'react';
import { Download, X, HelpCircle, Smartphone, Compass, ArrowUp, Share2 } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando no modo standalone (instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // Verifica se o usuário escolheu ignorar nesta sessão
    const isDismissed = sessionStorage.getItem('pwa-banner-dismissed') === 'true';

    // Se já estiver instalado ou tiver sido ignorado, não mostra o banner
    if (isStandalone) {
      return;
    }

    // Identifica se é iOS para personalizar as instruções do tutorial
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Se o evento for capturado, mostramos o banner imediatamente
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se não houver evento nativo em 3 segundos, mas for fora de standalone e não ignorado, mostramos o banner de qualquer forma com suporte ao tutorial
    const fallbackTimer = setTimeout(() => {
      if (!isDismissed) {
        setShowBanner(true);
      }
    }, 4000);

    // Monitora se o app já foi instalado
    const handleAppInstalled = () => {
      console.log('✨ GSA Câmara instalado com sucesso na tela inicial.');
      setShowBanner(false);
      setShowTutorial(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Exibe o prompt nativo do sistema operacional (Android/Chrome/Edge)
      deferredPrompt.prompt();
      
      // Aguarda a resposta do usuário
      const choiceResult = await deferredPrompt.userChoice;
      console.log(`Usuário escolheu: ${choiceResult.outcome}`);
      
      setDeferredPrompt(null);
      setShowBanner(false);
    } else {
      // Caso não tenha o evento nativo (Safari no iOS, Firefox, ou carregando em Iframe), abre o tutorial interativo
      setShowTutorial(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
    setShowBanner(false);
  };

  return (
    <>
      {/* Botão flutuante discreto quando o banner principal não está ativo */}
      {!showBanner && (
        <button
          id="pwa-floating-trigger"
          onClick={() => setShowBanner(true)}
          className="fixed bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-full shadow-2xl border border-indigo-500/20 z-[9998] flex items-center gap-2 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 animate-fade-in"
        >
          <Smartphone className="w-4 h-4 text-white animate-pulse" />
          <span>Baixar App GSA</span>
        </button>
      )}

      {/* Banner Principal de Convite */}
      {showBanner && (
        <div id="pwa-install-banner" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-950 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 z-[9999] animate-bounce-short">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Instalar Aplicativo Oficial</h4>
                <p className="text-xs text-slate-400">Acesse a GSA Câmara direto da sua tela inicial.</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-xs text-slate-300 mb-4">
            Receba alertas de andamentos, notificações de acordos e avisos sonoros em tempo real no seu aparelho.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              <Download className="w-4 h-4" /> Baixar App
            </button>
            <button
              onClick={handleDismiss}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Depois
            </button>
          </div>
        </div>
      )}

      {/* Modal/Popup Tutorial para Instalação Manual (Safari/iOS/Outros) */}
      {showTutorial && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowTutorial(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-indigo-600/10 p-3 rounded-full mb-3 text-indigo-400">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg">Como Instalar no seu Aparelho</h3>
              <p className="text-xs text-slate-400 mt-1">Siga o passo a passo rápido abaixo para ter o aplicativo oficial na sua tela inicial</p>
            </div>

            {isIOS ? (
              // Tutorial customizado para iPhone/iOS (Safari)
              <div className="space-y-4">
                <div className="flex gap-3 items-start bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="bg-indigo-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <p className="text-xs text-slate-200">
                    Abra este link no navegador <strong className="text-indigo-400">Safari</strong> do seu iPhone.
                  </p>
                </div>
                <div className="flex gap-3 items-start bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="bg-indigo-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <div className="text-xs text-slate-200 flex-1">
                    Toque no ícone de <strong className="text-indigo-400 flex items-center gap-1 inline-flex">Compartilhar <ArrowUp className="w-3.5 h-3.5 inline" /></strong> (quadrado com seta para cima) na barra inferior do Safari.
                  </div>
                </div>
                <div className="flex gap-3 items-start bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="bg-indigo-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <p className="text-xs text-slate-200">
                    Role as opções para baixo e selecione <strong className="text-indigo-400">"Adicionar à Tela de Início"</strong>.
                  </p>
                </div>
              </div>
            ) : (
              // Tutorial para Android, Chrome e outros navegadores onde o prompt não abriu
              <div className="space-y-4">
                <div className="flex gap-3 items-start bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="bg-indigo-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <p className="text-xs text-slate-200">
                    Clique no botão de <strong className="text-indigo-400">3 pontinhos (Menu)</strong> do seu navegador (geralmente no topo ou rodapé).
                  </p>
                </div>
                <div className="flex gap-3 items-start bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="bg-indigo-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <p className="text-xs text-slate-200">
                    Selecione a opção <strong className="text-indigo-400">"Instalar aplicativo"</strong> ou <strong className="text-indigo-400">"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
                <div className="flex gap-3 items-start bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="bg-indigo-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <p className="text-xs text-slate-200">
                    Confirme a instalação para criar o ícone da GSA Câmara no seu celular.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowTutorial(false)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer text-center block"
            >
              Entendi, vou fazer isso!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

