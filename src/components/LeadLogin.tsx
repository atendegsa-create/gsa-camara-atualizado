import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTenantResolver } from '../hooks/useTenantResolver';
import { Lock, Mail, User } from 'lucide-react';

export default function LeadLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultorRefId = searchParams.get('ref');
  
  // 1. O nosso hook mágico que já sabe qual é a unidade com base no URL
  const { resolvedTenant, loadingTenant } = useTenantResolver();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      if (isLogin) {
        // Fluxo de Login Existente
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // O AuthContext (que já atualizámos) vai detetar o login e redirecionar para o dashboard
      } else {
        // Fluxo de Registo de Novo Cliente/Lead
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // 2. O SEGREDO DO SAAS: Guardamos o utilizador já com o ID da unidade atual!
        await setDoc(doc(db, 'usuarios', user.uid), {
          id: user.uid,
          tenantId: resolvedTenant?.id || null, // Vincula o cliente à franquia (ex: gsaserra)
          consultor_id: consultorRefId || null, // Vincula o cliente ao consultor que indicou
          nome_completo: formData.nome,
          email: formData.email.toLowerCase(),
          tipo_usuario: 'CLIENTE',
          status: 'APROVADO',
          origem: resolvedTenant?.slug || 'master',
          createdAt: serverTimestamp()
        });
      }
      
      // Se tiver sucesso, envia para a raiz da unidade, e o App.tsx encaminha para o local certo
      navigate(`/${resolvedTenant?.slug || ''}/dashboard`);
      
    } catch (error: any) {
      console.error("Erro na autenticação:", error);
      let errorMessage = 'Falha na autenticação. Verifique os seus dados e tente novamente.';
      const errorCode = error.code || '';
      
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        errorMessage = 'E-mail ou senha incorretos. Verifique os dados informados.';
      } else if (errorCode === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas falhas. Aguarde alguns minutos e tente novamente.';
      } else if (errorCode === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso por outra conta.';
      } else if (errorCode === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = 'O e-mail informado é inválido.';
      }
      
      setErro(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingTenant) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium font-sans">A carregar ambiente...</p>
      </div>
    </div>
  );

  // 3. Aplicação do White-Label na Interface
  const logoUrl = resolvedTenant?.white_label?.logoUrl;
  const nomeUnidade = resolvedTenant?.nome_unidade || 'REDE GSA CÂMARA';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 overflow-hidden border border-gray-100">
        
        {/* Cabeçalho com as cores e logótipo da Unidade */}
        <div className="bg-primary p-10 text-center text-white flex flex-col items-center">
          {logoUrl ? (
            <div className="bg-white p-4 rounded-3xl shadow-lg mb-6 group transition-transform hover:scale-105">
              <img src={logoUrl} alt={nomeUnidade} className="h-16 object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
              <Lock className="w-10 h-10 text-white" />
            </div>
          )}
          <h2 className="text-3xl font-serif font-bold tracking-tight mb-2">{nomeUnidade}</h2>
          <p className="text-white/70 text-sm font-medium">
            {isLogin ? 'Aceda ao seu painel de acompanhamento' : 'Registe-se para iniciar o seu processo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {erro && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              {erro}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome Completo</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none transition-all font-medium"
                    placeholder="Seu nome legal"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">E-mail</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-300 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none transition-all font-medium"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Palavra-passe</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-300 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-[2rem] font-bold text-lg hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-primary/10 flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              isLogin ? 'Entrar no Portal' : 'Criar Conta e Continuar'
            )}
          </button>

          <div className="text-center pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[11px] font-black text-primary uppercase tracking-widest hover:text-black transition-colors"
            >
              {isLogin ? 'Não tem conta? Inicie o seu processo aqui.' : 'Já tem um processo? Faça login.'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
