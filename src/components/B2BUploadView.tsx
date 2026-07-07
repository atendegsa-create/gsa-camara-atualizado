import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Loader2, Building2, Download } from 'lucide-react';
import { DebtorImportRecord } from '../types';
import { useAuth } from '../AuthContext';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface B2BUploadViewProps {
  embeddedTenantId?: string;
  embeddedCredorId?: string;
  onSuccess?: () => void;
}

export const B2BUploadView: React.FC<B2BUploadViewProps> = ({ embeddedTenantId, embeddedCredorId, onSuccess }) => {
  const { user, isMaster, isAdminGeral } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [credores, setCredores] = useState<any[]>([]);
  const [selectedCredorId, setSelectedCredorId] = useState<string>(embeddedCredorId || '');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(embeddedTenantId || (user as any)?.tenantId || '');

  const [loadingCredores, setLoadingCredores] = useState(false);

  useEffect(() => {
    // Buscar credores ou o credorId específico
    const fetchCredores = async () => {
      if (embeddedTenantId && !embeddedCredorId) {
        // Se recebeu o tenantId (ex: via props do Dashboard), buscar o credor correspondente
        const q = query(collection(db!, 'recovery_credores'), where('tenantId', '==', embeddedTenantId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setSelectedCredorId(snapshot.docs[0].id);
        }
      } else if ((isMaster || isAdminGeral || (user as any)?.role === 'UNIDADE' || (user as any)?.role === 'GestorUnidade') && !embeddedTenantId) {
        setLoadingCredores(true);
        try {
          const q = (isMaster || isAdminGeral)
            ? query(collection(db!, 'recovery_credores'))
            : query(collection(db!, 'recovery_credores'), where('unidadeId', '==', (user as any)?.tenantId || 'master'));
            
          const snapshot = await getDocs(q);
          const creds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCredores(creds);
          
          if (creds.length > 0 && !selectedTenantId) {
            setSelectedCredorId(creds[0].id);
            setSelectedTenantId((creds[0] as any).tenantId);
          }
        } catch (err) {
          console.error("Erro ao buscar credores:", err);
        } finally {
          setLoadingCredores(false);
        }
      } else if ((user as any)?.role === 'CREDOR' && !embeddedTenantId) {
        // Para o próprio credor
        setSelectedTenantId((user as any).tenantId || '');
        const q = query(collection(db!, 'recovery_credores'), where('tenantId', '==', (user as any).tenantId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setSelectedCredorId(snapshot.docs[0].id);
        }
      }
    };
    fetchCredores();
  }, [user, isMaster, isAdminGeral, embeddedTenantId, embeddedCredorId]);

  const handleCredorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const credorId = e.target.value;
    const credor = credores.find(c => c.id === credorId);
    if (credor) {
      setSelectedCredorId(credor.id);
      setSelectedTenantId(credor.tenantId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const processCSV = (text: string): DebtorImportRecord[] => {
    const lines = text.split('\n');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const debtors: DebtorImportRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      
      const debtor: any = {};
      headers.forEach((header, index) => {
        const val = values[index]?.trim();
        if (header === 'valor_divida' || header === 'margem_desconto_maximo') {
          debtor[header] = parseFloat(val) || 0;
        } else {
          debtor[header] = val;
        }
      });
      debtors.push(debtor as DebtorImportRecord);
    }
    return debtors;
  };

  const handleDownloadTemplate = () => {
    const headers = ["nome", "documento", "telefone", "email", "valor_divida", "contrato_origem", "vencimento_original", "margem_desconto_maximo"];
    const csvContent = headers.join(",") + "\n" +
      "João da Silva,12345678909,5511999999999,joao@email.com,1500.50,CONT-123,2023-12-01,0.2\n" +
      "Maria Oliveira,98765432100,5511888888888,maria@email.com,450.00,CONT-456,2023-11-15,0.1\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_devedores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file || !selectedTenantId || !selectedCredorId) {
      setError("Selecione um arquivo e a empresa credora destino.");
      return;
    }
    
    setIsUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const debtorsJson = processCSV(text);

      const response = await fetch('/api/b2b/import-debtors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(user as any)?.token || ''}`
        },
        body: JSON.stringify({ 
          tenantId: selectedTenantId, 
          credorId: selectedCredorId, 
          debtors: debtorsJson 
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao processar lote');
      
      setResult(data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 ${embeddedTenantId ? '' : 'max-w-3xl mt-8'}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Importação B2B em Lote</h2>
        <p className="text-gray-500">Faça o upload de uma planilha CSV para iniciar milhares de negociações simultâneas via IA.</p>
      </div>

      {!embeddedTenantId && (isMaster || isAdminGeral || (user as any)?.role === 'UNIDADE' || (user as any)?.role === 'GestorUnidade') && (
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Empresa Credora Destino
          </label>
          {loadingCredores ? (
            <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando empresas...</p>
          ) : (
            <select 
              value={selectedCredorId} 
              onChange={handleCredorChange}
              className="w-full p-3 border border-slate-300 rounded-lg bg-white"
            >
              <option value="" disabled>Selecione a Empresa Credora</option>
              {credores.map(c => (
                <option key={c.id} value={c.id}>{c.razao_social} (CNPJ: {c.cnpj})</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="border-2 border-dashed border-blue-200 rounded-xl p-10 flex flex-col items-center justify-center bg-blue-50/50 transition-colors hover:bg-blue-50">
        <UploadCloud className="w-16 h-16 text-blue-500 mb-4" />
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm text-center">
            Selecionar Arquivo CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </label>
          <button
            onClick={handleDownloadTemplate}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo CSV
          </button>
        </div>
        {file && <p className="mt-4 flex items-center text-sm font-medium text-gray-700"><FileText className="w-4 h-4 mr-2"/> {file.name}</p>}
      </div>

      <div className="mt-6 flex justify-end">
        <button 
          onClick={handleUpload}
          disabled={!file || isUploading || !selectedTenantId}
          className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-all"
        >
          {isUploading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando Lote...</> : 'Iniciar Disparo em Massa'}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-100">
          <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
            <h3 className="text-lg font-bold">Lote Processado com Sucesso!</h3>
          </div>
          <ul className="space-y-2 ml-9">
            <li><strong>Total Processados:</strong> {result.total_processados}</li>
            <li><strong>Processos Criados:</strong> {result.sucesso}</li>
            <li className="text-sm mt-2">A IA Negociadora já assumiu os disparos no WhatsApp.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
