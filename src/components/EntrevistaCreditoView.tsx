import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { X, CheckCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EntrevistaCreditoViewProps {
  leadIdProp?: string;
  onClose?: () => void;
}

export default function EntrevistaCreditoView({ leadIdProp, onClose }: EntrevistaCreditoViewProps) {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [isShareMode, setIsShareMode] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const initialLeadId = leadIdProp || params.get('leadId') || '';

  const [currentLeadId, setCurrentLeadId] = useState(initialLeadId);
  const [cnpjSearch, setCnpjSearch] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
  const [cnpjSuccess, setCnpjSuccess] = useState('');

  // Estado estruturado idêntico à sua Ficha de Entrevista Oficial
  const [ficha, setFicha] = useState({
    // 1. Dados da Empresa
    razaoSocial: '', 
    nomeFantasia: '', 
    cnpj: '', 
    dataFundacao: '', 
    atividadePrincipal: '',
    telefoneFixo: '', 
    telefoneCelular: '', 
    emailEmpresa: '', 
    contatoResponsavel: '',

    // 2. Objetivo da Operação
    tipoOperacao: 'Capital de Giro', 
    finalidadeRecurso: '',

    // 3. Dados dos Sócios
    socio1: { nome: '', cpf: '', rgCnh: '', localNascimento: '', uf: '', estadoCivil: '', escolaridade: '', telefone: '', email: '', nomeConjuge: '', cpfConjuge: '' },
    socio2: { nome: '', cpf: '', rgCnh: '', localNascimento: '', uf: '', estadoCivil: '', escolaridade: '', telefone: '', email: '', nomeConjuge: '', cpfConjuge: '' },
    socio3: { nome: '', cpf: '', rgCnh: '', localNascimento: '', uf: '', estadoCivil: '', escolaridade: '', telefone: '', email: '', nomeConjuge: '', cpfConjuge: '' },

    // 4. Dados Operacionais
    condicaoSede: 'Própria quitada', 
    valorAluguel: '', 
    eFranquia: 'Não', 
    franqueador: '',
    qtdFuncionarios: '', 
    despesasPessoal: '', 
    faturamentoMedioMensal: '',

    // 5. Garantias
    possuiGarantia: 'Não', 
    descricaoGarantia: '',
    observacoes: '',
    
    // Declaração
    declaracaoNome: '', 
    declaracaoCpf: ''
  });

  // Carregar dados existentes do lead do Firestore se houver currentLeadId na URL
  useEffect(() => {
    if (!currentLeadId) return;
    setIsShareMode(true);

    const carregarDadosLead = async () => {
      try {
        const docRef = doc(db, 'leads_credito', currentLeadId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const existingFicha = data.dadosFicha || {};

          setFicha(prev => ({
            ...prev,
            razaoSocial: data.nomeEmpresa || prev.razaoSocial,
            nomeFantasia: data.nomeEmpresa || prev.nomeFantasia,
            cnpj: data.cnpj || prev.cnpj,
            contatoResponsavel: data.nomeAdministrador || prev.contatoResponsavel,
            telefoneCelular: data.whatsapp || prev.telefoneCelular,
            emailEmpresa: data.email || prev.emailEmpresa,
            declaracaoNome: data.nomeAdministrador || prev.declaracaoNome,
            socio1: {
              ...prev.socio1,
              nome: data.nomeAdministrador || prev.socio1.nome,
              cpf: data.cpfSocio || prev.socio1.cpf,
              telefone: data.whatsapp || prev.socio1.telefone,
              email: data.email || prev.socio1.email,
            },
            ...existingFicha
          }));
        }
      } catch (err) {
        console.error("Erro ao carregar fomento corporativo:", err);
      }
    };
    carregarDadosLead();
  }, [currentLeadId]);

  const handleCnpjValidation = async (cnpjToValidate: string) => {
    setCnpjError('');
    setCnpjSuccess('');
    
    if (!cnpjToValidate || !cnpjToValidate.trim()) {
      return;
    }

    setCnpjLoading(true);
    try {
      const { query, where, getDocs } = await import('firebase/firestore');
      const cleanCnpj = cnpjToValidate.replace(/\D/g, '');
      const q = query(collection(db, 'leads_credito'), where('cnpj', '==', cnpjToValidate.trim()));
      const querySnapshot = await getDocs(q);

      const processLead = (leadDoc: any) => {
        const leadData = leadDoc.data();
        setCurrentLeadId(leadDoc.id);
        setCnpjSuccess(`Empresa localizada: ${leadData.nomeEmpresa || leadData.empresa || 'Sem nome'}. Os dados foram vinculados.`);
        
        // Atualiza a ficha com os dados existentes
        setFicha(prev => ({
          ...prev,
          razaoSocial: leadData.nomeEmpresa || prev.razaoSocial,
          nomeFantasia: leadData.nomeEmpresa || prev.nomeFantasia,
          contatoResponsavel: leadData.nomeAdministrador || prev.contatoResponsavel,
          telefoneCelular: leadData.whatsapp || prev.telefoneCelular,
          emailEmpresa: leadData.email || prev.emailEmpresa,
          declaracaoNome: leadData.nomeAdministrador || prev.declaracaoNome,
          // mantém o resto intocado se não existir no lead
        }));
      };

      if (!querySnapshot.empty) {
        processLead(querySnapshot.docs[0]);
      } else {
        const q2 = query(collection(db, 'leads_credito'), where('cnpj', '==', cleanCnpj));
        const querySnapshot2 = await getDocs(q2);
        if (!querySnapshot2.empty) {
          processLead(querySnapshot2.docs[0]);
        } else {
          setCurrentLeadId(''); // reseta caso seja novo
          setCnpjSuccess('Novo CNPJ detectado. Um novo registro será criado ao salvar a ficha.');
        }
      }
    } catch (err) {
      console.error("Erro ao buscar CNPJ:", err);
      setCnpjError('Ocorreu um erro ao validar o CNPJ no banco de dados.');
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleExportarPDF = () => {
    const doc = new jsPDF();
    const titulo = "Dossiê Cadastral - GSA Câmara";
    const dataHora = new Date().toLocaleString('pt-BR');
    
    doc.setFontSize(16);
    doc.text(titulo, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Data de Emissão: ${dataHora}`, 14, 28);
    doc.text(`Empresa: ${ficha.razaoSocial || ficha.nomeFantasia || 'N/A'}`, 14, 34);
    doc.text(`CNPJ: ${ficha.cnpj || 'N/A'}`, 14, 40);

    const formatData = (data: Record<string, string>) => {
      return Object.entries(data).map(([key, value]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value || 'N/A']);
    };

    const section1 = formatData({
      RazãoSocial: ficha.razaoSocial,
      NomeFantasia: ficha.nomeFantasia,
      CNPJ: ficha.cnpj,
      DataDeFundação: ficha.dataFundacao,
      AtividadePrincipal: ficha.atividadePrincipal,
      TelefoneFixo: ficha.telefoneFixo,
      TelefoneCelular: ficha.telefoneCelular,
      Email: ficha.emailEmpresa
    });

    const section2 = formatData({
      NomeSócio1: ficha.socio1.nome,
      CPFSócio1: ficha.socio1.cpf,
      Participação1: ficha.socio1.participacao,
      NomeSócio2: ficha.socio2.nome,
      CPFSócio2: ficha.socio2.cpf,
      Participação2: ficha.socio2.participacao
    });

    const section3 = formatData({
      CondiçãoSede: ficha.condicaoSede,
      ValorAluguel: ficha.valorAluguel,
      ÉFranquia: ficha.eFranquia,
      Franqueador: ficha.franqueador,
      QuantidadeFuncionários: ficha.qtdFuncionarios,
      DespesasPessoal: ficha.despesasPessoal,
      FaturamentoMensal: ficha.faturamentoMedioMensal
    });
    
    const section4 = formatData({
      PossuiGarantia: ficha.possuiGarantia,
      DescriçãoGarantia: ficha.descricaoGarantia
    });

    autoTable(doc, {
      startY: 45,
      head: [['1. Dados da Empresa', '']],
      body: section1,
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['2. Estrutura Societária', '']],
      body: section2,
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['3. Informações Operacionais e Financeiras', '']],
      body: section3,
      theme: 'grid',
      styles: { fontSize: 9 }
    });
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['4. Garantias e Observações', '']],
      body: [...section4, ['Observações', ficha.observacoes || 'Nenhuma']],
      theme: 'grid',
      styles: { fontSize: 9 }
    });
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Declaração', '']],
      body: [
        ['Nome do Declarante', ficha.declaracaoNome],
        ['CPF do Declarante', ficha.declaracaoCpf]
      ],
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    doc.save(`Dossie_${ficha.cnpj || 'empresa'}.pdf`);
  };

  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Captura o afiliado_ref e UTMs de forma robusta e persistida globalmente
      const refId = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('gsa_ref') || sessionStorage.getItem('gsa_ref') || '';
      const parceiroId = new URLSearchParams(window.location.search).get('parceiro') || localStorage.getItem('gsa_parceiro') || sessionStorage.getItem('gsa_parceiro') || '';
      
      let utms: Record<string, string> = {};
      try {
        utms = JSON.parse(sessionStorage.getItem('gsa_utms') || localStorage.getItem('gsa_utms_last') || '{}');
      } catch (_) {}

      const payload = {
        ...ficha,
        afiliadoRef: refId,
        parceiroRef: parceiroId,
        utms,
        dataEntrevista: new Date().toISOString(),
        statusFicha: 'Aguardando Auditoria GSA'
      };

      if (currentLeadId) {
        // Modo Edição/Associação: Salva direto no lead correspondente do Firestore
        const docRef = doc(db, 'leads_credito', currentLeadId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentLeadData = docSnap.data();
          const updatedLead = {
            ...currentLeadData,
            dadosFicha: payload
          };

          const { checarStatusGeralLead } = await import('../App');
          const checagem = checarStatusGeralLead(updatedLead);

          await updateDoc(docRef, {
            dadosFicha: payload,
            statusInterno: checagem.statusGeral
          });

          // Sincroniza localmente
          const localLeads = JSON.parse(localStorage.getItem('gsa_credito_leads') || '[]');
          const updatedLocalLeads = localLeads.map((l: any) => {
            if (l.id === currentLeadId) {
              return {
                ...l,
                status: checagem.statusGeral === 'Pronto para Análise de Liberação' ? 'Análise Técnica' : 'Documentação Pendente'
              };
            }
            return l;
          });
          localStorage.setItem('gsa_credito_leads', JSON.stringify(updatedLocalLeads));
        }
      } else {
        // Salva um novo lead se não houver ID associado
        const { checarStatusGeralLead } = await import('../App');
        
        const newLeadPayload = {
          empresa: ficha.razaoSocial || ficha.nomeFantasia || 'Empresa Sem Nome',
          cnpj: ficha.cnpj,
          adminNome: ficha.contatoResponsavel || ficha.declaracaoNome,
          generoAdmin: 'Homem', // Padrão
          faturamentoAnual: 0, // Padrão
          solicitacaoCredito: 0, // Padrão
          tipoGarantia: 'Nenhuma',
          valorGarantia: 0,
          regimeTributario: 'Simples', // Padrão
          email: ficha.emailEmpresa,
          whatsapp: ficha.telefoneCelular,
          afiliadoRef: refId,
          parceiroRef: parceiroId,
          utms,
          dataRegistro: new Date().toISOString(),
          dadosFicha: payload,
          statusInterno: 'Documentação Pendente'
        };

        const checagem = checarStatusGeralLead(newLeadPayload as any);
        newLeadPayload.statusInterno = checagem.statusGeral;

        await addDoc(collection(db, 'leads_credito'), newLeadPayload);
      }

      setSucesso(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Erro ao salvar ficha de entrevista:", err);
      handleFirestoreError(err, OperationType.CREATE, 'fichas_entrevista_credito');
    } finally {
      setLoading(false);
    }
  };

  const renderSuccess = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl bg-white border border-slate-200 p-6 sm:p-10 rounded-2xl shadow-xl text-center space-y-6 relative">
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 bg-slate-100 rounded-lg border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Ficha Cadastrada com Sucesso!</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Os dados operacionais da empresa e dos sócios foram integrados à mesa de auditoria da Câmara GSA. O processo já está pronto para o ajuizamento e direcionamento bancário estratégico.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button 
            onClick={() => setSucesso(false)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-sm hover:shadow-md"
          >
            Nova Entrevista
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 font-medium text-xs px-6 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Fechar Janela
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (sucesso) {
    return renderSuccess();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 md:p-10 font-sans antialiased flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
        
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1.5 bg-slate-100 rounded-lg border border-slate-200 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <form onSubmit={handleSalvarFicha} className="p-5 sm:p-10 space-y-8">
          
          {/* TOPO DA FICHA */}
          <div className="border-b border-slate-100 pb-5 pr-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600 shrink-0" /> Ficha de Entrevista e Cadastro Operacional
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Dados estratégicos para análise, mitigação de riscos e condução da operação de crédito corporativo premium.
            </p>
          </div>

          {/* BLOCK 1: DADOS DA EMPRESA */}
          <section className="space-y-4">
            {cnpjSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs leading-relaxed font-normal shadow-sm mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>{cnpjSuccess}</strong>
                </div>
              </div>
            )}
            {cnpjError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs leading-relaxed font-normal shadow-sm mb-4">
                <div>
                  <strong>{cnpjError}</strong>
                </div>
              </div>
            )}
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">1️⃣ Dados da Empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Razão Social</label>
                <input required type="text" value={ficha.razaoSocial} onChange={e => setFicha({...ficha, razaoSocial: e.target.value})} placeholder="Ex: GSA Soluções e Associados Ltda" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nome Fantasia</label>
                <input type="text" value={ficha.nomeFantasia} onChange={e => setFicha({...ficha, nomeFantasia: e.target.value})} placeholder="Ex: Grupo Soluções" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all" />
              </div>
              <div className="relative">
                <label className="text-xs font-semibold text-slate-600 block mb-1">CNPJ {cnpjLoading && <span className="text-blue-500 ml-2 animate-pulse text-[10px]">Validando...</span>}</label>
                <input 
                  required 
                  type="text" 
                  value={ficha.cnpj} 
                  onChange={e => setFicha({...ficha, cnpj: e.target.value})} 
                  onBlur={() => handleCnpjValidation(ficha.cnpj)}
                  placeholder="00.000.000/0001-00" 
                  className={`w-full bg-slate-50 border rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none font-mono transition-all ${cnpjError ? 'border-red-400' : 'border-slate-200'}`} 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Data de Fundação</label>
                <input type="date" value={ficha.dataFundacao} onChange={e => setFicha({...ficha, dataFundacao: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Atividade Principal</label>
                <input type="text" value={ficha.atividadePrincipal} onChange={e => setFicha({...ficha, atividadePrincipal: e.target.value})} placeholder="Ex: Comércio Varejista" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Telefone Fixo</label>
                <input type="text" value={ficha.telefoneFixo} onChange={e => setFicha({...ficha, telefoneFixo: e.target.value})} placeholder="(54) 3462-0000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none font-mono transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Telefone Celular</label>
                <input required type="text" value={ficha.telefoneCelular} onChange={e => setFicha({...ficha, telefoneCelular: e.target.value})} placeholder="(54) 99999-0000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none font-mono transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">E-mail Corporativo</label>
                <input required type="email" value={ficha.emailEmpresa} onChange={e => setFicha({...ficha, emailEmpresa: e.target.value})} placeholder="financeiro@gsa.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all" />
              </div>
              <div className="sm:col-span-2 md:col-span-1">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Contato Responsável</label>
                <input type="text" value={ficha.contatoResponsavel} onChange={e => setFicha({...ficha, contatoResponsavel: e.target.value})} placeholder="Ex: Diretor Administrativo" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all" />
              </div>
            </div>
          </section>

          {/* BLOCK 2: OBJETIVO DA OPERAÇÃO */}
          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">2️⃣ Objetivo da Operação / Abertura de Conta</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Tipo de Operação Pretendida</label>
                <div className="flex flex-wrap gap-2">
                  {['Capital de Giro', 'PRONAMPE', 'FAMPE / FGI', 'Crédito com Garantia', 'Investimentos', 'Folha de Pagamento', 'Cobrança Bancária', 'Seguros'].map(op => (
                    <button 
                      type="button" 
                      key={op} 
                      onClick={() => setFicha({...ficha, tipoOperacao: op})} 
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${ficha.tipoOperacao === op ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100'}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Finalidade do Recurso (Informação Essencial para Análise Bancária) *</label>
                <textarea required value={ficha.finalidadeRecurso} onChange={e => setFicha({...ficha, finalidadeRecurso: e.target.value})} placeholder="Descrever de forma clara como o recurso será utilizado, qual o objetivo financeiro da operação e de que forma o crédito contribuará para a atividade e expansão da empresa..." className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all resize-none" />
              </div>
            </div>
          </section>

          {/* BLOCK 3: DADOS DOS SÓCIOS */}
          <section className="space-y-6 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">3️⃣ Dados dos Sócios / Procuradores</h3>
            
            {/* SÓCIO 1 */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-700 block">👤 Perfil do Sócio Qualificado 1 *</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Completo</label>
                  <input required type="text" placeholder="Nome Completo" value={ficha.socio1.nome} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, nome: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CPF</label>
                  <input required type="text" placeholder="000.000.000-00" value={ficha.socio1.cpf} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, cpf: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">RG / CNH</label>
                  <input type="text" placeholder="RG / CNH" value={ficha.socio1.rgCnh} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, rgCnh: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Naturalidade (Cidade)</label>
                  <input type="text" placeholder="Ex: Bento Gonçalves" value={ficha.socio1.localNascimento} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, localNascimento: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">UF Nascimento</label>
                  <input type="text" placeholder="RS" maxLength={2} value={ficha.socio1.uf} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, uf: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Estado Civil</label>
                  <input type="text" placeholder="Casado, Solteiro, etc." value={ficha.socio1.estadoCivil} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, estadoCivil: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Escolaridade</label>
                  <input type="text" placeholder="Grau de Instrução" value={ficha.socio1.escolaridade} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, escolaridade: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome do Cônjuge (Se houver)</label>
                  <input type="text" placeholder="Nome do Cônjuge" value={ficha.socio1.nomeConjuge} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, nomeConjuge: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CPF do Cônjuge (Se houver)</label>
                  <input type="text" placeholder="000.000.000-00" value={ficha.socio1.cpfConjuge} onChange={e => setFicha({...ficha, socio1: {...ficha.socio1, cpfConjuge: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono" />
                </div>
              </div>
            </div>

            {/* SÓCIO 2 */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-700 block">👤 Perfil do Sócio Qualificado 2 (Opcional)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Completo</label>
                  <input type="text" placeholder="Nome Completo" value={ficha.socio2.nome} onChange={e => setFicha({...ficha, socio2: {...ficha.socio2, nome: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CPF</label>
                  <input type="text" placeholder="000.000.000-00" value={ficha.socio2.cpf} onChange={e => setFicha({...ficha, socio2: {...ficha.socio2, cpf: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">RG / CNH</label>
                  <input type="text" placeholder="RG / CNH" value={ficha.socio2.rgCnh} onChange={e => setFicha({...ficha, socio2: {...ficha.socio2, rgCnh: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Naturalidade (Cidade)</label>
                  <input type="text" placeholder="Ex: Bento Gonçalves" value={ficha.socio2.localNascimento} onChange={e => setFicha({...ficha, socio2: {...ficha.socio2, localNascimento: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">UF Nascimento</label>
                  <input type="text" placeholder="RS" maxLength={2} value={ficha.socio2.uf} onChange={e => setFicha({...ficha, socio2: {...ficha.socio2, uf: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Estado Civil</label>
                  <input type="text" placeholder="Casado, Solteiro, etc." value={ficha.socio2.estadoCivil} onChange={e => setFicha({...ficha, socio2: {...ficha.socio2, estadoCivil: e.target.value}})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
          </section>

          {/* BLOCK 4: DADOS OPERACIONAIS */}
          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">4️⃣ Dados Operacionais da Empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Condições da Sede</label>
                <select value={ficha.condicaoSede} onChange={e => setFicha({...ficha, condicaoSede: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="Alugada">Alugada</option>
                  <option value="Própria quitada">Própria quitada</option>
                  <option value="Própria financiada">Própria financiada</option>
                  <option value="Do sócio">Do sócio</option>
                </select>
              </div>
              {ficha.condicaoSede === 'Alugada' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Valor do Aluguel (R$)</label>
                  <input type="number" value={ficha.valorAluguel} onChange={e => setFicha({...ficha, valorAluguel: e.target.value})} placeholder="Ex: 3500" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white font-mono" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">A empresa é Franquia?</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {['Sim', 'Não'].map(opt => (
                    <button type="button" key={opt} onClick={() => setFicha({...ficha, eFranquia: opt})} className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${ficha.eFranquia === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{opt}</button>
                  ))}
                </div>
              </div>
              {ficha.eFranquia === 'Sim' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nome do Franqueador</label>
                  <input type="text" value={ficha.franqueador} onChange={e => setFicha({...ficha, franqueador: e.target.value})} placeholder="Ex: Cacau Show" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Quantidade de Funcionários</label>
                <input type="number" value={ficha.qtdFuncionarios} onChange={e => setFicha({...ficha, qtdFuncionarios: e.target.value})} placeholder="Ex: 12" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Despesas com Pessoal (Mensal)</label>
                <input type="number" value={ficha.despesasPessoal} onChange={e => setFicha({...ficha, despesasPessoal: e.target.value})} placeholder="Ex: 24000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Faturamento Médio Mensal (R$)</label>
                <input type="number" value={ficha.faturamentoMedioMensal} onChange={e => setFicha({...ficha, faturamentoMedioMensal: e.target.value})} placeholder="Ex: 45000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white font-mono" />
              </div>
            </div>
          </section>

          {/* BLOCK 5: GARANTIAS */}
          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">5️⃣ Garantias Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Possui garantia aplicável?</label>
                <select value={ficha.possuiGarantia} onChange={e => setFicha({...ficha, possuiGarantia: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white cursor-pointer">
                  <option value="Não">Não</option>
                  <option value="Imóvel">Imóvel</option>
                  <option value="Veículo">Veículo</option>
                  <option value="Outros">Outros tipos</option>
                </select>
              </div>
              {ficha.possuiGarantia !== 'Não' && (
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Descrição da Garantia (Matrícula, Renavam, Modelo, Valor Estimado)</label>
                  <input type="text" value={ficha.descricaoGarantia} onChange={e => setFicha({...ficha, descricaoGarantia: e.target.value})} placeholder="Ex: Apartamento residencial em Farroupilha, Matrícula 12.345" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white" />
                </div>
              )}
            </div>
          </section>

          {/* BLOCK 6: OBSERVAÇÕES */}
          <section className="space-y-2 border-t border-slate-100 pt-5">
            <label className="text-xs font-semibold text-slate-600 block mb-1">6️⃣ Observações Estratégicas Extras</label>
            <textarea value={ficha.observacoes} onChange={e => setFicha({...ficha, observacoes: e.target.value})} placeholder="Insira aqui notas sobre o score interno, relacionamento com o banco de origem ou particularidades da auditoria..." className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white resize-none" />
          </section>

          {/* ASSINATURA E FORMALIZAÇÃO */}
          <section className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
            <span className="text-xs font-bold text-slate-800 block uppercase tracking-wider">📜 Declaração de Conformidade Cadastral</span>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Declaro que as informações prestadas acima são integralmente verdadeiras e autorizo a condução da análise cadastral, financeira e de histórico de score de crédito junto às instituições financeiras parceiras da Câmara GSA.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Completo do Declarante</label>
                <input required type="text" placeholder="Nome Completo do Declarante" value={ficha.declaracaoNome} onChange={e => setFicha({...ficha, declaracaoNome: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">CPF do Declarante</label>
                <input required type="text" placeholder="000.000.000-00" value={ficha.declaracaoCpf} onChange={e => setFicha({...ficha, declaracaoCpf: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono" />
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={handleExportarPDF}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm py-4 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> Exportar Dossiê
            </button>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs sm:text-sm py-4 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Transmitindo...' : '✓ Salvar Ficha Cadastral'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
