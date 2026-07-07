import React, { useState } from 'react';
import axios from 'axios';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { apiUrl } from '../lib/apiClient';

export const LawyerProcessView = ({ processo, onUpdate }: { processo: any, onUpdate?: () => void }) => {
  const [pendenciaNome, setPendenciaNome] = useState('');
  const [pendenciaTipo, setPendenciaTipo] = useState<'TEXTO' | 'ARQUIVO'>('TEXTO');
  const [observacao, setObservacao] = useState('');

  const handleUpdateStatus = async (status: string) => {
    try {
      // Chama a rota que criámos no server/routes/processes.ts
      await axios.post(`${apiUrl}/api/update-process/${processo.id}`, { 
        status, 
        observacao 
      });
      alert('Status atualizado e cliente notificado!');
    } catch (error) {
      alert('Erro ao atualizar status.');
    }
  };

  const adicionarPendencia = async () => {
    const novaPendencia = {
      id: Date.now(),
      nome: pendenciaNome,
      tipo: pendenciaTipo,
      status: 'PENDENTE',
      criadoEm: new Date().toISOString()
    };
    
    // Atualiza a pendência no Firebase
    await updateDoc(doc(db, 'juridico_processos', processo.id), {
      status: 'PENDENTE',
      pendencias: arrayUnion(novaPendencia)
    });
    setPendenciaNome('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-2xl border border-slate-100">
      <h2 className="text-2xl font-black text-indigo-900 mb-6 uppercase">Gestão Jurídica: {processo.clienteNome}</h2>
      
      {/* SELETOR DE STATUS */}
      <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Alterar Status do Processo:</label>
        <select 
          className="w-full p-4 border-2 border-indigo-100 rounded-xl font-bold text-indigo-900 focus:border-indigo-600 outline-none"
          defaultValue={processo.status}
          onChange={(e) => handleUpdateStatus(e.target.value)}
        >
          <option value="RECEBIDO">Recebido</option>
          <option value="PENDENTE">Pendente (Requer Ação)</option>
          <option value="ENVIADO_PARA_PROTOCOLO">Enviado para Protocolo</option>
          <option value="PROCESSO_ATIVO">Processo Ativo</option>
          <option value="PROCESSO_PAGO">Processo Pago</option>
          <option value="SEM_EXITO">Sem Êxito</option>
          <option value="PROCESSO_EM_RECURSO">Processo em Recurso</option>
          <option value="AUDIENCIA_AGENDADA">Audiência Agendada</option>
          <option value="PERICIA_AGENDADA">Perícia Agendada</option>
          <option value="OUTROS">Outros</option>
        </select>
        
        <textarea 
          placeholder="Observação para o cliente (se o status for Pendente)..."
          className="w-full mt-4 p-3 border rounded-lg text-sm"
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      {/* GESTÃO DE PENDÊNCIAS */}
      <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100">
        <h3 className="font-bold text-indigo-900 mb-4">Itens de Pendência</h3>
        <div className="flex gap-2 mb-4">
          <input 
            value={pendenciaNome}
            onChange={e => setPendenciaNome(e.target.value)}
            placeholder="Nome da pendência (ex: RG do Cliente)"
            className="flex-1 p-3 border rounded-lg text-sm"
          />
          <select 
              value={pendenciaTipo}
              onChange={e => setPendenciaTipo(e.target.value as 'TEXTO' | 'ARQUIVO')}
              className="p-3 border rounded-lg bg-white"
          >
              <option value="TEXTO">Texto</option>
              <option value="ARQUIVO">Arquivo</option>
          </select>
          <button onClick={adicionarPendencia} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">+</button>
        </div>
        
        <div className="space-y-2">
          {processo.pendencias?.map((p: any) => (
            <div key={p.id} className="flex justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-sm font-medium">{p.nome}</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">{p.tipo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
