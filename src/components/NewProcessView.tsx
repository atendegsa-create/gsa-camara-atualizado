import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Save, UserCircle, Scale, Building2, FilePlus, Loader2, ChevronLeft } from 'lucide-react';
import { ProcessStatus } from '../types';
import { useAuth } from '../AuthContext';
import { createProcess } from '../lib/db';

export function NewProcessView() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<string[]>(['Revisional Consignado', 'Revisional Habitacional', 'Cobrança Extrajudicial', 'Ação Indenizatória', 'Ação Contratual', 'Outro']);
  
  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_documento: '',
    cliente_whatsapp: '',
    cliente_email: '',
    parte_contraria_nome: '',
    parte_contraria_documento: '',
    parte_contraria_email: '',
    parte_contraria_telefone: '',
    tipo_acao: '',
    tipo_acao_outro: '',
    status: 'LEAD_NOVO' as ProcessStatus,
    valor_estimado_recuperacao: '',
    valor_tap: '',
    status_tap: 'PENDENTE',
    data_pagamento_tap: '',
    forma_pagamento_tap: '',
    percentual_exito: '',
    resumo_fato: '',
    solicitacoes: '',
    parceiro_tag: ''
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'tracking');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().processTypes) {
          const configTypes = snap.data().processTypes
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t);
          if (configTypes.length > 0) {
            setTypes(configTypes);
            if (!formData.tipo_acao) {
              setFormData(prev => ({ ...prev, tipo_acao: configTypes[0] }));
            }
          }
        } else {
           setFormData(prev => ({ ...prev, tipo_acao: types[0] }));
        }
      } catch (err) {
        console.error('Error fetching process types', err);
        setFormData(prev => ({ ...prev, tipo_acao: types[0] }));
      }
    };
    fetchConfig();
  }, [types, formData.tipo_acao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_nome || !formData.tipo_acao || !profile) return;
    setLoading(true);

    try {
      const nup = `GSA-${new Date().getFullYear()}${new Date().getMonth() + 1}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Cria a entrada principal com injeção automática de tenant
      const docId = await createProcess({
        nup,
        status: formData.status as ProcessStatus,
        tipo_acao: formData.tipo_acao === 'Outro' ? formData.tipo_acao_outro : formData.tipo_acao,
        cliente_nome: formData.cliente_nome,
        cliente_documento: formData.cliente_documento,
        cliente_whatsapp: formData.cliente_whatsapp,
        cliente_email: formData.cliente_email,
        parte_contraria_nome: formData.parte_contraria_nome,
        parte_contraria_documento: formData.parte_contraria_documento,
        parte_contraria_email: formData.parte_contraria_email,
        parte_contraria_telefone: formData.parte_contraria_telefone,
        valor_estimado_recuperacao: Number(formData.valor_estimado_recuperacao) || 0,
        valor_tap: Number(formData.valor_tap) || 0,
        status_tap: formData.status_tap as any,
        data_pagamento_tap: formData.data_pagamento_tap ? new Date(formData.data_pagamento_tap).toISOString() : null,
        forma_pagamento_tap: formData.forma_pagamento_tap,
        percentual_exito: Number(formData.percentual_exito) || 0,
        resumo_fato: formData.resumo_fato,
        solicitacoes: formData.solicitacoes,
        parceiro_tag: formData.parceiro_tag || null,
        criado_por: auth.currentUser?.uid,
        cliente_id: auth.currentUser?.uid, // Para simplificar, vinculamos inicialmente ao ADM se não houver logic de invite
        logs: [
          { status: formData.status, mensagem: "Processo avulso criado via painel interno.", data: new Date().toISOString() }
        ]
      }, profile);

      // Cria a visão do acompanhamento público
      await setDoc(doc(db, "consulta_publica", nup), {
        nup,
        status: formData.status as any,
        tipo_acao: formData.tipo_acao,
        cliente_documento: formData.cliente_documento || 'ND',
        criado_em: serverTimestamp(),
        logs: [
          { status: formData.status, data: new Date().toISOString() }
        ]
      });

      alert(`Processo criado com sucesso! NUP: ${nup}`);
      navigate(`../${docId}`);

    } catch (error) {
      console.error("Erro ao criar processo:", error);
      alert("Houve um erro ao incluir o processo manual.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('..')}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Inclusão Manual de Processo</h2>
          <p className="text-gray-500">Adicione um novo processo cível, securitário ou de terceiros diretamente.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Bloco: Dados do Cliente */}
        <div className="p-8 border-b border-gray-100 space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-xl font-serif text-[#5A5A40]">
            <UserCircle size={24} /> O Nosso Cliente (Requerente)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo *</label>
              <input 
                required
                type="text" 
                value={formData.cliente_nome}
                onChange={e => setFormData({...formData, cliente_nome: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">CPF/CNPJ</label>
              <input 
                type="text" 
                value={formData.cliente_documento}
                onChange={e => setFormData({...formData, cliente_documento: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">E-mail</label>
              <input 
                type="email" 
                value={formData.cliente_email}
                onChange={e => setFormData({...formData, cliente_email: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="joao@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
              <input 
                type="tel" 
                value={formData.cliente_whatsapp}
                onChange={e => setFormData({...formData, cliente_whatsapp: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Indicação / Parceiro</label>
              <input 
                type="text" 
                value={formData.parceiro_tag}
                onChange={e => setFormData({...formData, parceiro_tag: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="Ex: Consultor X"
              />
            </div>
          </div>
        </div>

        {/* Bloco: Parte Contrária */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-xl font-serif text-gray-700">
            <Building2 size={24} /> A Parte Contrária (Requerido)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nome/Razão Social *</label>
              <input 
                required
                type="text" 
                value={formData.parte_contraria_nome}
                onChange={e => setFormData({...formData, parte_contraria_nome: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="Ex: Seguradora XPTO"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">CNPJ/CPF Contrário</label>
              <input 
                type="text" 
                value={formData.parte_contraria_documento}
                onChange={e => setFormData({...formData, parte_contraria_documento: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">E-mail Contrário</label>
              <input 
                type="email" 
                value={formData.parte_contraria_email}
                onChange={e => setFormData({...formData, parte_contraria_email: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Telefone Contrário</label>
              <input 
                type="tel" 
                value={formData.parte_contraria_telefone}
                onChange={e => setFormData({...formData, parte_contraria_telefone: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>
        </div>

        {/* Bloco: Litígio/Ação */}
        <div className="p-8 space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-xl font-serif text-[#5A5A40]">
            <Scale size={24} /> O Objeto da Ação
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Processo *</label>
              <select 
                required
                value={formData.tipo_acao}
                onChange={e => setFormData({...formData, tipo_acao: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none font-medium bg-white"
              >
                {types.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {formData.tipo_acao === 'Outro' && (
              <div className="space-y-1 md:col-span-1 md:col-start-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Especificar Tipo *</label>
                <input 
                  required
                  type="text" 
                  value={formData.tipo_acao_outro}
                  onChange={e => setFormData({...formData, tipo_acao_outro: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  placeholder="Qual o tipo de processo?"
                />
              </div>
            )}
            
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Fase/Status Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as ProcessStatus})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none font-medium bg-white"
              >
                <option value="LEAD_NOVO">Lead Novo</option>
                <option value="AGUARDANDO_TAP">Aguardando TAP</option>
                <option value="TRIAGEM">Em Análise / Triagem</option>
                <option value="NOTIFICACAO">Emissão de Notificação</option>
                <option value="AUDIENCIA">Marcado para Audiência</option>
                <option value="ACORDO">Concluído c/ Acordo</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Valor do Pleito (R$)</label>
              <input 
                type="number" 
                value={formData.valor_estimado_recuperacao}
                onChange={e => setFormData({...formData, valor_estimado_recuperacao: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="Ex: 15000"
              />
            </div>

            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Percentual de Êxito (%)</label>
              <input 
                type="number" 
                value={formData.percentual_exito}
                onChange={e => setFormData({...formData, percentual_exito: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="Ex: 30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Valor da TAP (R$)</label>
              <input 
                type="number" 
                value={formData.valor_tap}
                onChange={e => setFormData({...formData, valor_tap: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="Ex: 297"
              />
            </div>

            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Status da TAP</label>
              <select 
                value={formData.status_tap}
                onChange={e => setFormData({...formData, status_tap: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none font-medium bg-white"
              >
                <option value="PENDENTE">Pendente</option>
                <option value="PAGAMENTO_REALIZADO">Pago</option>
              </select>
            </div>

            {formData.status_tap === 'PENDENTE' && (
              <>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Data Promessa Pagamento</label>
                  <input 
                    type="date" 
                    value={formData.data_pagamento_tap}
                    onChange={e => setFormData({...formData, data_pagamento_tap: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none text-gray-700"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Forma de Pagamento</label>
                  <select 
                    value={formData.forma_pagamento_tap}
                    onChange={e => setFormData({...formData, forma_pagamento_tap: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none font-medium bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Resumo do fato a ser conciliado/mediado/arbitrado</label>
              <textarea 
                value={formData.resumo_fato}
                onChange={e => setFormData({...formData, resumo_fato: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none min-h-[120px]"
                placeholder="Descreva brevemente os fatos..."
              />
          </div>

          <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Solicitações (Documentos, fotos, provas, testemunhas com nome, telefone e e-mail)</label>
              <textarea 
                value={formData.solicitacoes}
                onChange={e => setFormData({...formData, solicitacoes: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none min-h-[120px]"
                placeholder="Detalhe os documentos, provas ou testemunhas (nome, telefone, e-mail)..."
              />
          </div>
        </div>

        {/* Footer/Ações */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('..')}
            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-[#333] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <FilePlus size={20} />}
            Cadastrar Processo
          </button>
        </div>

      </form>
    </div>
  );
}
