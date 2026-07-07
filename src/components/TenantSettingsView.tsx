import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Building2, Save, CheckCircle2, MapPin, FileText, Phone } from 'lucide-react';

export default function TenantSettingsView() {
  const { user, tenant, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [dados, setDados] = useState({
    razao_social: '',
    cnpj: '',
    endereco: '',
    telefone_central: ''
  });

  useEffect(() => {
    if (tenant) {
      setDados({
        razao_social: tenant.razao_social || '',
        cnpj: tenant.cnpj || '',
        endereco: tenant.endereco || '',
        telefone_central: tenant.telefone_central || ''
      });
    }
  }, [tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;

    setLoading(true);
    try {
      const tenantRef = doc(db, 'tenants', user.tenantId);
      await updateDoc(tenantRef, {
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        endereco: dados.endereco,
        telefone_central: dados.telefone_central
      });
      setSucesso(true);
      if (refreshProfile) {
        await refreshProfile(); // Atualiza os dados no contexto global
      }
      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-amber-500 w-6 h-6" /> Dados da Unidade
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Estas informações serão utilizadas oficialmente nos Termos de Acordo e Procurações gerados pelo sistema.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" /> Razão Social
              </label>
              <input 
                type="text" 
                value={dados.razao_social}
                onChange={e => setDados({...dados, razao_social: e.target.value})}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                placeholder="Ex: Câmara Privada de Mediação XYZ Ltda"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" /> CNPJ
              </label>
              <input 
                type="text" 
                value={dados.cnpj}
                onChange={e => setDados({...dados, cnpj: e.target.value})}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" /> Endereço Completo
            </label>
            <input 
              type="text" 
              value={dados.endereco}
              onChange={e => setDados({...dados, endereco: e.target.value})}
              className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
              placeholder="Rua, Número, Bairro, Cidade - Estado, CEP"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4" /> Telefone de Atendimento Padrão
            </label>
            <input 
              type="text" 
              value={dados.telefone_central}
              onChange={e => setDados({...dados, telefone_central: e.target.value})}
              className="w-full md:w-1/2 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
              placeholder="(00) 0000-0000"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
            {sucesso && <span className="text-emerald-500 flex items-center gap-2 font-semibold text-sm"><CheckCircle2 className="w-4 h-4"/> Salvo com sucesso!</span>}
            <button 
              type="submit" 
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'A salvar...' : <><Save className="w-4 h-4" /> Guardar Dados</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
