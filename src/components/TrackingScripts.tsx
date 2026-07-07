import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

export function TrackingScripts() {
  const location = useLocation();

  useEffect(() => {
    const loadScripts = async () => {
      try {
        const docRef = doc(db, 'config', 'tracking');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() || true) { // Always check master even if tracking doc missing
          const data = docSnap.exists() ? docSnap.data() : {};
          
          // Fetch master config for AR Online pixels
          const masterRef = doc(db, 'config', 'master');
          const masterSnap = await getDoc(masterRef);
          const masterData = masterSnap.exists() ? masterSnap.data() : {};

          const path = location.pathname;

          let headContent = '';
          let footerContent = '';

          // Helper to generate FB Pixel script from ID
          const getFBPixelScript = (id: string) => {
            if (!id || id.trim() === '') return '';
            const trimmedId = id.trim();
            // Check if it's already a script tag or just an ID
            if (trimmedId.includes('<script')) return trimmedId;
            return `
              <!-- Facebook Pixel Code -->
              <script>
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${trimmedId}');
                fbq('track', 'PageView');
              </script>
              <noscript>
                <img height="1" width="1" style="display:none"
                src="https://www.facebook.com/tr?id=${trimmedId}&ev=PageView&noscript=1"
                />
              </noscript>
              <!-- End Facebook Pixel Code -->
            `;
          };

          // TikTok Pixel Helper
          const getTikTokScript = (id: string) => {
            if (!id || id.trim() === '') return '';
            const trimmedId = id.trim();
            if (trimmedId.includes('<script')) return trimmedId;
            return `
              <!-- TikTok Pixel Code -->
              <script>
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndVerify=function(t,n){const a=n.split(".");let e=t;a.forEach(function(n){e[n]=e[n]||{},e=e[n]}),e.set=n,e.get=n};for(var i=0;i<ttq.methods.length;i++)ttq.setAndVerify(ttq,ttq.methods[i]);ttq.instance=function(t){for(var n=ttq._i[t]||[],e=0;e<ttq.methods.length;e++)ttq.setAndVerify(n,ttq.methods[e]);return n},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${trimmedId}');
                ttq.page();
              }(window, document, 'ttq');
              </script>
              <!-- End TikTok Pixel Code -->
            `;
          }

          if (path === '/site-comercial') {
            headContent = (data.comercialPixel || '') + (data.comercialHeaderScripts || '');
            footerContent = (data.comercialFooterScripts || '');
          } else if (path === '/analise-online') {
            headContent = (data.onlineAppPixel || '') + (data.onlineAppHeaderScripts || '');
            footerContent = (data.onlineAppFooterScripts || '');
          } else if (path === '/notificacao-digital' || path === '/limpa-nome') {
            // AR Online LP and Quiz specific pixels from master config
            headContent = getFBPixelScript(masterData.pixel_facebook) + getTikTokScript(masterData.pixel_tiktok) + (data.headerScripts || '');
            footerContent = (data.footerScripts || '');
          } else if (path === '/' || path === '/landing' || path === '/quiz-rx-inss' || path === '/rx-inss-sucesso') {
            headContent = (data.facebookPixel || '') + (data.tiktokPixel || '') + getFBPixelScript(data.facebookPixelId) + (data.headerScripts || '');
            footerContent = (data.footerScripts || '');
          }

          // Cleanup previous injections
          document.querySelectorAll('[data-tracking-injected]').forEach(el => el.remove());

          // Inject Head Scripts
          if (headContent) {
            const range = document.createRange();
            const documentFragment = range.createContextualFragment(headContent);
            documentFragment.querySelectorAll('*').forEach(el => el.setAttribute('data-tracking-injected', 'true'));
            document.head.appendChild(documentFragment);
          }
          
          // Inject Footer Scripts
          if (footerContent) {
            const range = document.createRange();
            const documentFragment = range.createContextualFragment(footerContent);
            documentFragment.querySelectorAll('*').forEach(el => el.setAttribute('data-tracking-injected', 'true'));
            document.body.appendChild(documentFragment);
          }
        }
      } catch (error: any) {
        if (error.code === 'unavailable') {
          console.warn("Cliente offline. Não foi possível carregar os scripts de rastreamento.");
        } else {
          console.error("Erro ao carregar scripts de rastreamento:", error);
        }
      }
    };

    loadScripts();
  }, [location.pathname]);

  return null;
}
