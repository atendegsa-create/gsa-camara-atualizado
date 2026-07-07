import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

interface Processo {
  id: string;
  cliente?: string;
  unidade?: string;
  tipo?: string;
  status?: string;
  dadosPreenchidos?: Record<string, string>;
  documentos?: { nome: string; status: 'Pendente' | 'Anexado'; obrigatorio: boolean }[];
  operadoresVinculados?: string[];
  audiencias?: string[];
}

interface ModeloEsteira {
  id: string;
  nomeAcao: string; // Ex: Revisão de Juros
  camposObrigatorios: string[]; // Ex: ['Banco', 'Parcela']
  documentosExigidos: string[]; // Ex: ['Procuração', 'RG/CPF']
}

export default function JuridicoProcessManagementView() {
  const [viewMode, setViewMode] = useState<'master' | 'operador' | 'usuario'>('master');
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [modelos, setModelos] = useState<ModeloEsteira[]>([]);
  const [selectedProcId, setSelectedProcId] = useState<string>('');
  
  // Estados para gerenciar novas entradas
  const [novoEmail, setNovoEmail] = useState('');
  const [novoDocExigido, setNovoDocExigido] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isModeloModalOpen, setIsModeloModalOpen] = useState(false);
  const [isProcessoModalOpen, setIsProcessoModalOpen] = useState(false);

  // Estados para criação de Modelo de Esteira
  const [novoNomeAcao, setNovoNomeAcao] = useState('');
  const [novoCamposObrigatorios, setNovoCamposObrigatorios] = useState('');
  const [novoDocumentosExigidos, setNovoDocumentosExigidos] = useState('');

  // Estados para cadastro de Processo Dinâmico
  const [novoCliente, setNovoCliente] = useState('');
  const [novaUnidade, setNovaUnidade] = useState('');
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('');
  const [dadosInputs, setDadosInputs] = useState<Record<string, string>>({});

  // Escuta em tempo real a coleção oficial de processos do Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'processos'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Processo));
      setProcessos(list);
      setLoading(false);
      
      // Seleciona automaticamente o primeiro item caso nenhum esteja ativo
      if (list.length > 0 && !selectedProcId) {
        setSelectedProcId(list[0].id);
      }
    }, (error) => {
      console.error("Erro ao conectar ao Firestore (processos):", error);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedProcId]);

  // Escuta em tempo real os modelos de esteira jurídica do Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'modelos_esteira'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModeloEsteira));
      setModelos(list);
    }, (error) => {
      console.error("Erro ao carregar modelos_esteira:", error);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-sm font-medium animate-pulse">Sincronizando com o Firestore GSA...</p>
        </div>
      </div>
    );
  }

  // Captura o documento exato clicado na barra lateral
  const processoAtivo = processos.find(p => p.id === selectedProcId);

  // Inclui uma nova pendência documental direto no array do Firestore
  const incluirNovoDocumentoExigido = async () => {
    if (!novoDocExigido.trim() || !processoAtivo) return;
    try {
      const docRef = doc(db, 'processos', processoAtivo.id);
      await updateDoc(docRef, {
        documentos: arrayUnion({ nome: novoDocExigido.trim(), status: 'Pendente', obrigatorio: true })
      });
      setNovoDocExigido('');
      alert("Nova exigência documental registrada no Firestore!");
    } catch (err) {
      console.error("Erro ao incluir documento exigido:", err);
    }
  };

  // Vincula o e-mail de um advogado parceiro ao caso real
  const adicionarOperador = async () => {
    if (!novoEmail.trim() || !processoAtivo) return;
    try {
      const docRef = doc(db, 'processos', processoAtivo.id);
      await updateDoc(docRef, {
        operadoresVinculados: arrayUnion(novoEmail.trim())
      });
      setNovoEmail('');
      alert("Advogado/Parceiro vinculado com sucesso no Firestore!");
    } catch (err: any) {
      alert("Erro ao salvar no banco: " + err.message);
    }
  };

  // Altera o status do documento para Anexado (Simulação de Upload pela Unidade/Cliente)
  const handleUploadDocumentoCliente = async (nomeDoc: string) => {
    if (!processoAtivo || !processoAtivo.documentos) return;
    try {
      const docsAtualizados = processoAtivo.documentos.map(d => {
        if (d.nome === nomeDoc) return { ...d, status: 'Anexado' as const };
        return d;
      });
      await updateDoc(doc(db, 'processos', processoAtivo.id), {
        documentos: docsAtualizados
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Atualiza em tempo real um input de dado cadastral digitado
  const handleAtualizarDadoCliente = async (campo: string, valor: string) => {
    if (!processoAtivo) return;
    try {
      const novosDados = { ...processoAtivo.dadosPreenchidos, [campo]: valor };
      await updateDoc(doc(db, 'processos', processoAtivo.id), {
        dadosPreenchidos: novosDados
      });
    } catch(err) {
      console.error(err);
    }
  };

  // Geração de Ficha Cadastral em PDF estruturado
  const baixarFichaPDFMock = (proc: Processo) => {
    const docPdf = new jsPDF();
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(16);
    docPdf.text("CÂMARA GSA - EXTRAJUDICIAL", 20, 20);
    docPdf.setFontSize(12);
    docPdf.text("FICHA DE ACOMPANHAMENTO PROCESSUAL", 20, 30);
    docPdf.line(20, 33, 190, 33);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(`ID do Processo: ${proc.id}`, 20, 45);
    docPdf.text(`Cliente/Requerente: ${proc.cliente || 'Não Informado'}`, 20, 55);
    docPdf.text(`Unidade Regional: ${proc.unidade || 'Farroupilha'}`, 20, 65);
    docPdf.text(`Tipo de Ação: ${proc.tipo || 'Revisão'}`, 20, 75);
    docPdf.text(`Status da Esteira: ${proc.status || 'Triagem'}`, 20, 85);
    let y = 100;
    Object.entries(proc.dadosPreenchidos || {}).forEach(([chave, valor]) => {
      docPdf.text(`• ${chave}: ${valor || 'Pendente'}`, 25, y);
      y += 10;
    });
    docPdf.save(`Ficha_GSA_${proc.id}.pdf`);
  };

  // Empacotamento de Kit Digital em formato .ZIP compactado
  const baixarTodosArquivosZIPMock = async (proc: Processo) => {
    const zip = new JSZip();
    const contratoDoc = new jsPDF();
    contratoDoc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS - GSA", 20, 20);
    zip.file("1_Contrato_Prestacao_Servicos_GSA.pdf", contratoDoc.output('blob'));
    const contentBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(contentBlob);
    link.download = `Kit_Juridico_GSA_${proc.id}.zip`;
    link.click();
  };

  // Adiciona novo template de ação na coleção 'modelos_esteira'
  const handleCriarModelo = async () => {
    if (!novoNomeAcao.trim()) {
      alert("Por favor, informe o nome do tipo de ação.");
      return;
    }
    try {
      const campos = novoCamposObrigatorios.split(',').map(s => s.trim()).filter(Boolean);
      const docs = novoDocumentosExigidos.split(',').map(s => s.trim()).filter(Boolean);
      
      await addDoc(collection(db, 'modelos_esteira'), {
        nomeAcao: novoNomeAcao.trim(),
        camposObrigatorios: campos,
        documentosExigidos: docs
      });

      setNovoNomeAcao('');
      setNovoCamposObrigatorios('');
      setNovoDocumentosExigidos('');
      setIsModeloModalOpen(false);
      alert("Modelo de Esteira criado com sucesso no Firestore!");
    } catch (err: any) {
      console.error("Erro ao criar modelo:", err);
      alert("Erro ao salvar o modelo: " + err.message);
    }
  };

  // Remove um template de ação
  const handleExcluirModelo = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este modelo de esteira jurídica?")) return;
    try {
      await deleteDoc(doc(db, 'modelos_esteira', id));
      alert("Modelo removido com sucesso!");
    } catch (err: any) {
      console.error("Erro ao deletar modelo:", err);
      alert("Erro ao deletar modelo: " + err.message);
    }
  };

  // Cria um novo processo baseando-se no modelo dinâmico selecionado
  const handleCriarProcesso = async () => {
    if (!novoCliente.trim()) {
      alert("Por favor, preencha o nome do Cliente.");
      return;
    }
    if (!modeloSelecionadoId) {
      alert("Selecione um modelo de esteira jurídica cadastrado.");
      return;
    }
    const modelo = modelos.find(m => m.id === modeloSelecionadoId);
    if (!modelo) {
      alert("O modelo selecionado não é válido.");
      return;
    }

    try {
      const checklistDocs = modelo.documentosExigidos.map(nome => ({
        nome,
        status: 'Pendente' as const,
        obrigatorio: true
      }));

      const dadosMapeados: Record<string, string> = {};
      modelo.camposObrigatorios.forEach(campo => {
        dadosMapeados[campo] = dadosInputs[campo] || '';
      });

      const novoProcDoc = {
        cliente: novoCliente.trim(),
        unidade: novaUnidade.trim() || 'Farroupilha',
        tipo: modelo.nomeAcao,
        status: 'Pendente',
        dadosPreenchidos: dadosMapeados,
        documentos: checklistDocs,
        operadoresVinculados: [],
        audiencias: []
      };

      const docRef = await addDoc(collection(db, 'processos'), novoProcDoc);
      
      // Limpeza de estados
      setNovoCliente('');
      setNovaUnidade('');
      setModeloSelecionadoId('');
      setDadosInputs({});
      setIsProcessoModalOpen(false);
      
      // Auto-selecionar o novo processo criado
      setSelectedProcId(docRef.id);
      alert("Processo cadastrado com sucesso no Firestore GSA!");
    } catch (err: any) {
      console.error("Erro ao criar processo:", err);
      alert("Erro ao criar processo: " + err.message);
    }
  };

  // Monitora mudança de modelo no cadastro do processo para limpar os inputs mapeados
  const handleModeloChange = (id: string) => {
    setModeloSelecionadoId(id);
    setDadosInputs({});
  };

  return (
    <div className="p-6 bg-[#0B131A] text-white min-h-screen font-sans">
      {/* Menu Superior / Seletor de Perfis */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#111E29] p-4 rounded-xl mb-6 border border-[#1C2D3D] gap-4">
        <div>
          <h2 className="text-lg font-bold text-blue-400">⚖️ Gestão de Processos Judiciais — Câmara GSA</h2>
          <p className="text-xs text-slate-400">Controle, delegação de advogados e transparência em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewMode === 'master' && (
            <button 
              onClick={() => setIsModeloModalOpen(true)} 
              className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-xs px-3 py-2 rounded-lg font-bold border border-purple-700/50 transition-colors"
            >
              ⚙️ Modelos da Esteira
            </button>
          )}
          <button 
            onClick={() => setIsProcessoModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition-colors"
          >
            ➕ Cadastrar Novo Processo
          </button>
          
          <div className="w-[1px] bg-[#1C2D3D] mx-2 hidden md:block"></div>
          
          <button onClick={() => setViewMode('master')} className={`text-xs px-3 py-2 rounded-lg font-bold transition-colors ${viewMode === 'master' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>👑 Admin Master</button>
          <button onClick={() => setViewMode('operador')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'operador' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>🧑‍⚖️ Operador Delegado</button>
          <button onClick={() => setViewMode('usuario')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'usuario' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>🏢 Usuário/Unidade</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Esquerda: Listagem Baseada em IDs e Registros Reais */}
        <div className="bg-[#111E29] p-4 rounded-xl border border-[#1C2D3D]">
          <h3 className="font-bold border-b border-[#1C2D3D] pb-3 mb-4 flex justify-between items-center">
            <span>📁 Processos Ativos</span>
            <span className="bg-[#1C2D3D] px-2 py-0.5 rounded-full text-xs text-blue-400">{processos.length}</span>
          </h3>
          {processos.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum processo encontrado na coleção do banco.</p>
          ) : (
            <div className="space-y-3 font-sans max-h-[70vh] overflow-y-auto pr-1">
              {processos.map(p => (
                <div key={p.id} onClick={() => setSelectedProcId(p.id)} className={`p-3 rounded-xl cursor-pointer border transition-all ${p.id === selectedProcId ? 'bg-[#1A365D] border-blue-500' : 'bg-[#16222F] border-transparent hover:border-slate-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-blue-400">ID: {p.id.slice(0, 8)}...</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.status === 'Pendente' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-green-400'}`}>{p.status || 'Pendente'}</span>
                  </div>
                  <h4 className="text-sm font-semibold truncate">{p.cliente || 'Caso sem Nome'}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">📍 {p.unidade || 'Farroupilha'} | {p.tipo || 'Geral'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel Direito: Mesa de Controle de Detalhes */}
        <div className="lg:col-span-2 bg-[#111E29] p-6 rounded-xl border border-[#1C2D3D]">
          {!processoAtivo ? (
            <p className="text-sm text-slate-400 text-center py-12">Selecione um processo na barra lateral para iniciar a auditoria.</p>
          ) : (
            <>
              <div className="flex justify-between items-start border-b border-[#1C2D3D] pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold mb-1">{processoAtivo.cliente || 'Caso sem Nome'}</h3>
                  <span className="text-xs bg-[#1C2D3D] text-slate-300 px-2.5 py-1 rounded-md">Esteira / Ação: {processoAtivo.tipo || 'Não Definida'}</span>
                </div>
                {viewMode !== 'usuario' && (
                  <div className="flex gap-2">
                    <button onClick={() => baixarFichaPDFMock(processoAtivo)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">📄 Ficha PDF</button>
                    <button onClick={() => baixarTodosArquivosZIPMock(processoAtivo)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">⬇ Kit ZIP</button>
                  </div>
                )}
              </div>

              {/* Seção 1: Dados Cadastrais */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-400 mb-3">📊 Informações Cadastrais da Ação</h4>
                {!processoAtivo.dadosPreenchidos || Object.keys(processoAtivo.dadosPreenchidos).length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">⚠️ Este cliente não possui chaves de dados configuradas no Firestore para este modelo.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#16222F] p-4 rounded-xl">
                    {Object.entries(processoAtivo.dadosPreenchidos).map(([campo, valor]) => (
                      <div key={campo} className="text-sm">
                        <span className="text-xs text-slate-400 block mb-1">{campo}:</span>
                        {viewMode === 'usuario' ? (
                          <input type="text" value={valor} onChange={(e) => handleAtualizarDadoCliente(campo, e.target.value)} className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
                        ) : (
                          <strong className={valor ? "text-white" : "text-rose-400"}>{valor || 'Não preenchido'}</strong>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 2: Checklist de Uploads */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-400 mb-3">🗂️ Documentações Exigidas (Checklist Real)</h4>
                <div className="bg-[#16222F] p-4 rounded-xl space-y-3">
                  {!processoAtivo.documentos || processoAtivo.documentos.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum documento atrelado a este processo no banco de dados.</p>
                  ) : (
                    processoAtivo.documentos.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-[#233547] pb-2 last:border-b-0 last:pb-0">
                        <span className="text-sm">{doc.nome}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold ${doc.status === 'Anexado' ? 'text-green-400' : 'text-amber-400'}`}>
                            {doc.status === 'Anexado' ? '✓ Anexado' : '🛑 Pendente'}
                          </span>
                          {viewMode === 'usuario' && doc.status === 'Pendente' && (
                            <button onClick={() => handleUploadDocumentoCliente(doc.nome)} className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-1 px-2.5 rounded-lg border border-amber-500/30 transition-colors">Simular Envio</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {viewMode === 'master' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-[#233547]">
                      <input type="text" value={novoDocExigido} onChange={(e) => setNovoDocExigido(e.target.value)} placeholder="Ex: Adicionar nova exigência (Ex: Extrato INSS)..." className="flex-1 bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      <button onClick={incluirNovoDocumentoExigido} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 rounded-lg transition-colors">+ Exigir Doc</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 3: Delegação e Distribuição */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-400 mb-3">👥 Vinculação e Delegação de Operadores (Parceiros Advogados)</h4>
                <div className="bg-[#16222F] p-4 rounded-xl space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-md bg-blue-950/50 text-blue-400 border border-blue-900/40">👑 master@camaragsa.com.br</span>
                    {processoAtivo.operadoresVinculados?.map((email, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">🧑‍⚖️ {email}</span>
                    ))}
                  </div>
                  {viewMode === 'master' && (
                    <div className="flex gap-2 pt-2">
                      <input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="Adicionar e-mail do advogado parceiro para transferir o caso..." className="flex-1 bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      <button onClick={adicionarOperador} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-lg transition-colors">Vincular e Transferir</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: Gerenciamento de Modelos da Esteira */}
      {isModeloModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111E29] border border-[#233547] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#233547] flex justify-between items-center bg-[#16222F]">
              <h3 className="text-lg font-bold text-purple-400">⚙️ Modelos da Esteira Jurídica ('modelos_esteira')</h3>
              <button onClick={() => setIsModeloModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
              {/* Formulário para criar novo Modelo */}
              <div className="bg-[#0B131A] p-4 rounded-xl border border-[#233547] space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Novo Tipo de Ação / Esteira</h4>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nome do Tipo de Ação:</label>
                  <input 
                    type="text" 
                    value={novoNomeAcao}
                    onChange={(e) => setNovoNomeAcao(e.target.value)}
                    placeholder="Ex: Revisão de Juros Abusivos, Ação Previdenciária" 
                    className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campos Cadastrais Obrigatórios (Separados por vírgula):</label>
                  <input 
                    type="text" 
                    value={novoCamposObrigatorios}
                    onChange={(e) => setNovoCamposObrigatorios(e.target.value)}
                    placeholder="Ex: Banco Credor, Valor do Financiamento, Numero de Parcelas" 
                    className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Insira chaves textuais que o cliente ou unidade deverá preencher.</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Chaves de Arquivos / Documentos Exigidos (Separados por vírgula):</label>
                  <input 
                    type="text" 
                    value={novoDocumentosExigidos}
                    onChange={(e) => setNovoDocumentosExigidos(e.target.value)}
                    placeholder="Ex: Procuracao, RG e CPF, Contrato Assinado" 
                    className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Mapeie os documentos oficiais exigidos para essa esteira.</p>
                </div>
                <div className="text-right">
                  <button 
                    onClick={handleCriarModelo}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
                  >
                    Salvar Modelo de Esteira
                  </button>
                </div>
              </div>

              {/* Listagem de Modelos cadastrados no Firestore */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Modelos Ativos no Firestore</h4>
                {modelos.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 bg-[#16222F] rounded-xl border border-[#233547]">Nenhum modelo cadastrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {modelos.map(m => (
                      <div key={m.id} className="bg-[#16222F] border border-[#233547] p-4 rounded-xl flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-purple-400 text-sm mb-1">{m.nomeAcao}</h5>
                          <p className="text-xs text-slate-300 mb-1">
                            <span className="text-slate-500 font-semibold">Campos Cadastrais:</span> {m.camposObrigatorios.join(', ') || 'Nenhum'}
                          </p>
                          <p className="text-xs text-slate-300">
                            <span className="text-slate-500 font-semibold">Arquivos Exigidos:</span> {m.documentosExigidos.join(', ') || 'Nenhum'}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleExcluirModelo(m.id)}
                          className="bg-red-950/40 border border-red-900/50 hover:bg-red-950 text-red-400 text-[10px] px-2 py-1 rounded-md font-bold transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-[#16222F] border-t border-[#233547] text-right">
              <button 
                onClick={() => setIsModeloModalOpen(false)} 
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cadastro Dinâmico de Novo Processo */}
      {isProcessoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111E29] border border-[#233547] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#233547] flex justify-between items-center bg-[#16222F]">
              <h3 className="text-lg font-bold text-blue-400">➕ Cadastrar Novo Caso Processual</h3>
              <button onClick={() => setIsProcessoModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo do Cliente / Requerente:</label>
                <input 
                  type="text" 
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  placeholder="Ex: João da Silva Santos" 
                  className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Unidade */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Unidade Regional:</label>
                <input 
                  type="text" 
                  value={novaUnidade}
                  onChange={(e) => setNovaUnidade(e.target.value)}
                  placeholder="Ex: Farroupilha, Porto Alegre, Caxias" 
                  className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mapeamento de Modelos em Tempo Real */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Selecione a Esteira / Tipo de Ação:</label>
                <select 
                  value={modeloSelecionadoId}
                  onChange={(e) => handleModeloChange(e.target.value)}
                  className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Selecione um template cadastrado --</option>
                  {modelos.map(m => (
                    <option key={m.id} value={m.id}>{m.nomeAcao}</option>
                  ))}
                </select>
                {modelos.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">⚠️ Não existem modelos cadastrados na base 'modelos_esteira'. Acesse 'Modelos da Esteira' com o perfil Master para criar um primeiro template.</p>
                )}
              </div>

              {/* Renderização Dinâmica dos Campos com base no Modelo Selecionado */}
              {modeloSelecionadoId && (
                <div className="bg-[#16222F] border border-[#233547] p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-[#233547] pb-2">📋 Campos Cadastrais Requeridos pelo Template</h4>
                  
                  {(() => {
                    const modelo = modelos.find(m => m.id === modeloSelecionadoId);
                    if (!modelo || modelo.camposObrigatorios.length === 0) {
                      return <p className="text-xs text-slate-400">Este modelo não exige preenchimento cadastral imediato.</p>;
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {modelo.camposObrigatorios.map(campo => (
                          <div key={campo}>
                            <label className="block text-xs text-slate-400 mb-1">{campo}:</label>
                            <input 
                              type="text" 
                              value={dadosInputs[campo] || ''}
                              onChange={(e) => setDadosInputs({ ...dadosInputs, [campo]: e.target.value })}
                              placeholder={`Preencha o valor de ${campo}`}
                              className="w-full bg-[#111E29] border border-[#233547] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-[#233547] pb-2 pt-2">🗂️ Checklist de Documentos que serão Gerados</h4>
                  {(() => {
                    const modelo = modelos.find(m => m.id === modeloSelecionadoId);
                    if (!modelo || modelo.documentosExigidos.length === 0) {
                      return <p className="text-xs text-slate-400">Nenhum documento listado neste modelo.</p>;
                    }
                    return (
                      <div className="flex flex-wrap gap-2">
                        {modelo.documentosExigidos.map(doc => (
                          <span key={doc} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md border border-slate-700/50">
                            🛑 {doc} (Pendente)
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-[#16222F] border-t border-[#233547] flex justify-end gap-2">
              <button 
                onClick={() => setIsProcessoModalOpen(false)} 
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCriarProcesso}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Cadastrar no Firestore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
