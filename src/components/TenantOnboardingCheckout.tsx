import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Building2, CreditCard, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const TenantOnboardingCheckout = () => {
  const { tenant, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleGerarPix = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Não autenticado");

      // Chama a mesma rota de checkout, ou uma especial?
      // Neste caso a pessoa quer pagar a adesão da unidade
      const valor = tenant?.configContrato?.entradaPaga || 297;
      
      const payload = {
        tenantId: tenant?.id,
        nome: profile?.nome_completo || tenant?.nome_unidade,
        email: profile?.email || tenant?.email,
        whatsapp: tenant?.telefone || '',
        valorAdesao: valor,
        descricao: "Taxa de Adesão GSA Master",
        externalReference: `adesao_tenant_${tenant?.id}`
      };

      // 1. Resolve Asaas Customer
      const custResp = await axios.post('/api/asaas/customer', {
        name: payload.nome,
        email: payload.email,
        cpfCnpj: (tenant as any)?.documento || '00000000000',
        mobilePhone: payload.whatsapp
      }, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      const customerId = custResp.data.id;

      // 2. Create payment in our own API or direct Asaas
      const resp = await axios.post('/api/asaas/split-charge', {
        paymentData: {
          customer: customerId,
          value: valor,
          description: payload.descricao,
          externalReference: payload.externalReference
        },
        splits: [], // Direct to Master, so no splits needed
        tenantId: tenant?.id
      }, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      setPixData(resp.data);
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível gerar a cobrança. Tente novamente ou contate o suporte.");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!tenant?.id) return;
    try {
      // check backend payment status or local refresh
      const docRef = doc(db, 'tenants', tenant.id);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().status === 'ATIVO') {
        window.location.reload();
      } else {
        alert("O pagamento ainda não foi confirmado. O sistema libera o acesso em alguns minutos após o PIX.");
      }
    } catch(err) {
      handleFirestoreError(err, OperationType.GET, 'tenants');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 relative z-10 border border-white/80"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
            <Building2 size={32} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">Finalize a Adesão</h1>
          <p className="text-gray-500 mt-2 font-medium">Libere o acesso da unidade <strong className="text-gray-900">{tenant?.nome_unidade}</strong> à plataforma Câmara GSA.</p>
        </div>

        {!pixData ? (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Adesão / Entrada</p>
                <p className="text-3xl font-bold text-gray-900">R$ {tenant?.configContrato?.entradaPaga?.toFixed(2) || '297.00'}</p>
              </div>
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>

            <button 
              onClick={handleGerarPix}
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold text-lg py-5 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="animate-spin w-5 h-5" /> Gerando Pagamento...</>
              ) : (
                <><CreditCard className="w-5 h-5" /> Pagar via PIX</>
              )}
            </button>
            {error && <p className="text-red-500 text-center text-sm font-medium">{error}</p>}
          </div>
        ) : (
          <div className="space-y-8 flex flex-col items-center">
            <div className="text-center">
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">Aguardando Pagamento</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border-2 border-indigo-50 shadow-xl w-64 h-64 flex items-center justify-center mx-auto relative overflow-hidden group">
              <img src={pixData.pixImage} alt="QR Code PIX" className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-105" />
            </div>

            <div className="w-full space-y-4">
              <p className="text-center text-sm font-medium text-gray-500">Ou use o código Copia e Cola:</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={pixData.copiaECola} 
                  readOnly 
                  className="flex-1 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-xl px-4 py-3 text-sm font-mono text-gray-600 outline-none truncate"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.copiaECola);
                    alert("Código copiado!");
                  }}
                  className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>

            <button 
              onClick={checkStatus}
              className="mt-6 text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Já paguei, verificar status
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
