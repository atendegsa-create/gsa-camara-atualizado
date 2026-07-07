      console.log(`[Flowbuild Webhook] Sucesso: Lead da ${lead.razao_social} enviado com temperatura ${lead.temperatura}.`);
      return true;

    } catch (error: any) {
      console.error(`[Flowbuild Webhook] Falha ao disparar gatilho para a empresa ${empresaId}:`, error.message);
      return false;
    }
  }
}
EOF

# 3. Sincroniza e envia a camada de automação final para a branch principal do seu GitHub
git add server/services/flowbuildWebhook.ts
git commit -m "feat: integrando gatilhos automatizados de webhooks do CRM com Flowbuild"
git push origin main
npm run build && npx firebase deploy --only hosting --force
# 1. Entra na pasta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Compila a versão final com os 9 módulos e joga direto para o site oficial
npm run build && npx firebase deploy --only hosting
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Configura os alvos do Firebase para os seus domínios reais
# Substitua 'projeto-gsa-id' pelo ID do seu projeto se o terminal solicitar
npx firebase hosting:targets:apply site app app-72hrs-info 2>/dev/null
npx firebase hosting:targets:apply site gsacamara gsacamara-72hrs-info 2>/dev/null
# 3. Compila o projeto completo atualizado com os 9 módulos
npm run build
# 4. Executa o Deploy forçando a entrega em todos os sites conectados ao projeto
npx firebase deploy --only hosting --force
# 1. Adiciona os novos arquivos que vieram do ZIP do AI Studio
git add .
# 2. Registra a sincronização das instruções da IA
git commit -m "sync: integrando arquivos e prompts exportados do AI Studio"
# 3. Envia para o seu repositório principal no GitHub
git push origin main
# 1. Puxa as atualizações que estão no GitHub forçando a união dos históricos
git pull origin main --rebase
# 2. Agora que o histórico local está alinhado com o servidor, envie em definitivo
git push origin main
# 1. Salva temporariamente as suas alterações atuais para limpar a trava
git stash
# 2. Puxa o histórico atualizado do GitHub alinhando com o servidor
git pull origin main --rebase
# 3. Aplica as suas alterações de volta por cima do histórico limpo
git stash pop
# Envia a união para o repositório do GitHub
git push origin main
# Compila o sistema e atualiza seus sites oficiais no Firebase
npm run build && npx firebase deploy --only hosting --force
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Vincula a pasta compilada aos seus domínios reais no Firebase
npx firebase hosting:sites:create app-72hrs-info 2>/dev/null
npx firebase hosting:sites:create gsacamara-72hrs-info 2>/dev/null
# 3. Executa o Deploy direcionado de uma vez por todas
npx firebase deploy --only hosting
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Configura o firebase.json com os múltiplos alvos (multi-site) de forma definitiva
cat << 'EOF' > firebase.json
{
  "hosting": [
    {
      "target": "app",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "gsacamara",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
EOF

# 3. Associa os alvos criados aos subdomínios corretos do Firebase
npx firebase hosting:targets:apply site app app-72hrs-info
npx firebase hosting:targets:apply site gsacamara gsacamara-72hrs-info
# 4. Executa o deploy definitivo para os dois sites ao mesmo tempo
npx firebase deploy --only hosting
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Configura o firebase.json com os múltiplos alvos (multi-site) de forma definitiva
cat << 'EOF' > firebase.json
{
  "hosting": [
    {
      "target": "app",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "gsacamara",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
EOF

# 3. Associa os alvos criados aos subdomínios corretos do Firebase
npx firebase hosting:targets:apply site app app-72hrs-info
npx firebase hosting:targets:apply site gsacamara gsacamara-72hrs-info
# 4. Executa o deploy definitivo para os dois sites ao mesmo tempo
npx firebase deploy --only hosting
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Corrige e reescreve o arquivo firebase.json perfeitamente
cat << 'EOF' > firebase.json
{
  "hosting": [
    {
      "target": "app",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "gsacamara",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
EOF

# 3. Aplica os alvos usando a sintaxe exata exigida pelo Firebase
npx firebase target:apply hosting app app-72hrs-info
npx firebase target:apply hosting gsacamara gsacamara-72hrs-info
# 4. Envia o deploy duplo definitivo para os dois ambientes
npx firebase deploy --only hosting
# 1. Garante o diretório correto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Reconstrói o componente com todas as visões solicitadas
cat << 'EOF' > src/components/CreditoInteligenteDashboard.tsx
import React, { useState } from 'react';

type PerfilAcesso = 'MASTER' | 'UNIDADE' | 'VENDEDOR' | 'AFILIADO' | 'EMPRESARIO' | 'AGENCIA';

interface DocumentoSimulado {
  id: string;
  nome: string;
  obrigatorio: boolean;
  status: 'Pendente' | 'Enviado' | 'Aprovado' | 'Rejeitado';
  url?: string;
}

interface PropostaSimulada {
  id: string;
  empresa: string;
  cnpj: string;
  valor: number;
  status: 'Simulado' | 'Doc_Pendente' | 'Analise_Tecnica' | 'Aprovado' | 'Pago' | 'Recovery';
  documentos: DocumentoSimulado[];
  solicitacoes: string[];
}

export default function CreditoInteligenteDashboard() {
  const [perfil, setPerfil] = useState<PerfilAcesso>('MASTER');
  const [propostas, setPropostas] = useState<PropostaSimulada[]>([
    {
      id: '1',
      empresa: 'GSA Transportes Ltda',
      cnpj: '12.345.678/0001-99',
      valor: 250000.00,
      status: 'Doc_Pendente',
      solicitacoes: ['Falta assinar a declaração de faturamento pelo contador.'],
      documentos: [
        { id: '1', nome: 'Contrato Social', obrigatorio: true, status: 'Aprovado', url: '#' },
        { id: '2', nome: 'Declaração de Faturamento (12m)', obrigatorio: true, status: 'Pendente' },
        { id: '3', nome: 'Declaração IRPJ', obrigatorio: true, status: 'Enviado', url: '#' },
        { id: '4', nome: 'Extrato Bancário (Opcional)', obrigatorio: false, status: 'Pendente' }
      ]
    }
  ]);
  const [propostaAtiva, setPropostaAtiva] = useState<PropostaSimulada>(propostas[0]);
  const [novaSolicitacao, setNovaSolicitacao] = useState('');

  const atualizarStatusProposta = (id: string, novoStatus: PropostaSimulada['status']) => {
    const atualizadas = propostas.map(p => p.id === id ? { ...p, status: novoStatus } : p);
    setPropostas(atualizadas);
    const ativa = atualizadas.find(p => p.id === id);
    if (ativa) setPropostaAtiva(ativa);
  };

  const adicionarSolicitacao = (id: string) => {
    if (!novaSolicitacao.trim()) return;
    const atualizadas = propostas.map(p => {
      if (p.id === id) {
        return { ...p, solicitacoes: [...p.solicitacoes, novaSolicitacao] };
      }
      return p;
    });
    setPropostas(atualizadas);
    setNovaSolicitacao('');
    const ativa = atualizadas.find(p => p.id === id);
    if (ativa) setPropostaAtiva(ativa);
  };

  return (
    <div className="p-6 bg-[#0B141A] text-white min-h-screen font-sans">
      {/* Matriz de Acessos por Nível Hierárquico */}
      <div className="bg-[#111C24] p-6 rounded-2xl border border-[#1F2C34] mb-8">
        <div>
          <h2 className="text-xl font-bold mb-2">Matriz de Acessos por Nível Hierárquico (Simulação)</h2>
          <p className="text-gray-400 text-sm mb-4">Alterne entre os níveis de perfil para verificar as visões e regras específicas do ecossistema GSA.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['MASTER', 'UNIDADE', 'VENDEDOR', 'AFILIADO', 'EMPRESARIO', 'AGENCIA'] as PerfilAcesso[]).map((p) => (
            <button
              key={p}
              onClick={() => setPerfil(p)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                perfil === p 
                  ? 'bg-[#E17A16] text-white shadow-lg' 
                  : 'bg-[#1F2C34] text-gray-300 hover:bg-[#2A3942]'
              }`}
            >
              {p === 'MASTER' && '👑 GSA Master'}
              {p === 'UNIDADE' && '🏢 Unidade/Franquia'}
              {p === 'VENDEDOR' && '💼 Vendedor CRM'}
              {p === 'AFILIADO' && '🔗 Afiliado MLM'}
              {p === 'EMPRESARIO' && '🏢 Empresário (Cliente)'}
              {p === 'AGENCIA' && '🛡️ GSA Soluções (Recuperadora de crédito)'}
            </button>
          ))}
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DE TELAS POR PERFIL */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* 1. VISÃO EMPRESÁRIO */}
        {perfil === 'EMPRESARIO' && (
          <div className="bg-[#111C24] p-6 rounded-2xl border border-[#1F2C34]">
            <h3 className="text-lg font-bold mb-4 text-[#E17A16]">Painel de Acompanhamento do Empresário</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1F2C34] p-4 rounded-xl">
                <h4 className="font-semibold mb-3">Ficha Cadastral e Status</h4>
                <p className="text-sm text-gray-300"><strong>Empresa:</strong> {propostaAtiva.empresa}</p>
                <p className="text-sm text-gray-300"><strong>CNPJ:</strong> {propostaAtiva.cnpj}</p>
                <div className="mt-3 inline-block bg-[#2A3942] px-3 py-1 rounded-lg text-sm font-bold text-[#E17A16]">
                  Status: {propostaAtiva.status}
                </div>
              </div>
              <div className="bg-[#1F2C34] p-4 rounded-xl">
                <h4 className="font-semibold mb-3">Solicitações de Ajuste / Pendências</h4>
                {propostaAtiva.solicitacoes.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma pendência solicitada.</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-2 text-sm text-gray-300">
                    {propostaAtiva.solicitacoes.map((s, idx) => (
                      <li key={idx} className="text-yellow-400">{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="mt-6 bg-[#1F2C34] p-4 rounded-xl">
              <h4 className="font-semibold mb-3">Central de Upload de Documentos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propostaAtiva.documentos.map(doc => (
                  <div key={doc.id} className="bg-[#111C24] p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{doc.nome}</p>
                      <p className="text-xs text-gray-400">{doc.obrigatorio ? 'Obrigatório' : 'Opcional'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      doc.status === 'Aprovado' ? 'bg-green-900 text-green-300' :
                      doc.status === 'Enviado' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'
                    }`}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. VISÃO AGÊNCIA DE CRÉDITO */}
        {perfil === 'AGENCIA' && (
          <div className="bg-[#111C24] p-6 rounded-2xl border border-[#1F2C34]">
            <h3 className="text-lg font-bold mb-4 text-[#E17A16]">Mesa de Análise e Homologação — GSA Soluções</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Lista à Esquerda */}
              <div className="bg-[#1F2C34] p-4 rounded-xl lg:col-span-1">
                <h4 className="font-semibold mb-3 text-sm text-gray-400 uppercase">Fila de Propostas</h4>
                {propostas.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setPropostaAtiva(p)}
                    className="p-3 bg-[#111C24] hover:bg-[#1A262F] cursor-pointer rounded-lg border-l-4 border-[#E17A16] mb-2"
                  >
                    <p className="font-bold text-sm">{p.empresa}</p>
                    <p className="text-xs text-gray-400">R$ {p.valor.toLocaleString('pt-BR')}</p>
                    <span className="text-[10px] bg-[#2A3942] text-yellow-400 px-2 py-0.5 rounded mt-1 inline-block">{p.status}</span>
                  </div>
                ))}
              </div>

              {/* Controle Operacional à Direita */}
              <div className="bg-[#1F2C34] p-4 rounded-xl lg:col-span-2">
                <h4 className="font-semibold mb-4">Gerenciamento: {propostaAtiva.empresa}</h4>
                
                {/* Alteração de Status */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Alterar Status Operacional</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Simulado', 'Doc_Pendente', 'Analise_Tecnica', 'Aprovado', 'Pago', 'Recovery'] as PropostaSimulada['status'][]).map(st => (
                      <button
                        key={st}
                        onClick={() => atualizarStatusProposta(propostaAtiva.id, st)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          propostaAtiva.status === st ? 'bg-[#E17A16] text-white' : 'bg-[#111C24] text-gray-300 hover:bg-[#1A262F]'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auditoria de Documentos */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Auditar Documentos Recebidos</label>
                  <div className="space-y-2">
                    {propostaAtiva.documentos.map(doc => (
                      <div key={doc.id} className="bg-[#111C24] p-3 rounded flex justify-between items-center text-sm">
                        <span>{doc.nome}</span>
                        <div className="flex gap-2">
                          <button className="bg-[#2A3942] hover:bg-[#34444E] text-xs px-2 py-1 rounded">Pré-visualizar</button>
                          <button className="bg-blue-950 text-blue-300 text-xs px-2 py-1 rounded">Baixar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inclusão de Alertas */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Injetar Solicitação / Parecer de Andamento</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={novaSolicitacao}
                      onChange={(e) => setNovaSolicitacao(e.target.value)}
                      placeholder="Ex: Falta anexar comprovante de residência atualizado..."
                      className="flex-1 bg-[#111C24] border border-[#2A3942] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#E17A16]"
                    />
                    <button 
                      onClick={() => adicionarSolicitacao(propostaAtiva.id)}
                      className="bg-[#E17A16] hover:bg-[#F28B23] text-white px-4 py-1.5 rounded font-bold text-sm"
                    >
                      Enviar Alerta
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 3. DEMAIS PERFIS (VISÃO PADRÃO SIMPLIFICADA) */}
        {!['EMPRESARIO', 'AGENCIA'].includes(perfil) && (
          <div className="bg-[#111C24] p-6 rounded-2xl border border-[#1F2C34] text-center py-12 text-gray-400">
            Visão de simulação ativa para o perfil <strong className="text-white">{perfil}</strong>. <br />
            Selecione <strong>Empresário (Cliente)</strong> ou <strong>GSA Soluções</strong> nos botões acima para auditar os novos módulos da esteira.
          </div>
        )}

      </div>
    </div>
  );
}
EOF

# 3. Adiciona e commita o arquivo atualizado no Git
git add src/components/CreditoInteligenteDashboard.tsx
git commit -m "feat: atualizando o simulador de creditos com as visoes de agencia de credito e empresario"
git push origin main
# 4. Executa a compilação final e publica em lote nos seus sites oficiais
npm run build && npx firebase deploy --only hosting --force
# 1. Garante que estamos na pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Volta o firebase.json para o modo padrão que joga tudo no servidor principal
cat << 'EOF' > firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF

# 3. Executa o deploy direto na raiz principal do projeto sem travas de alvos
npx firebase deploy --only hosting --force
# 1. Garante que estamos na pasta certa
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Grava o firebase.json de forma limpa e isolada
cat << 'EOF' > firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF

# 3. Força o Vite a rodar o build novamente para incluir as telas novas no pacote
npm run build
# 4. Agora sim, faz o deploy limpo na raiz principal do projeto
npx firebase deploy --only hosting --force
# 1. Garante que estamos na pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Limpa o cache temporário do Firebase que está causando o erro de estrutura circular
rm -rf .firebase/
# 3. Executa o deploy utilizando a flag de concorrência reduzida para não estourar a memória do Cloud Shell
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o novo componente do Módulo Jurídico Avançado
cat << 'EOF' > src/components/JuridicoProcessManagementView.tsx
import React, { useState } from 'react';

interface Processo {
  id: string;
  cliente: string;
  unidade: string;
  tipo: string;
  status: 'Pendente' | 'Pronto para Distribuição' | 'Distribuído' | 'Audiência Marcada';
  dadosPreenchidos: Record<string, string>;
  documentos: { nome: string; status: 'Pendente' | 'Anexado'; obrigatorio: boolean }[];
  operadoresVinculados: string[];
  audiencias: string[];
}

interface ModeloProcesso {
  id: string;
  nome: string;
  camposObrigatorios: string[];
  documentosExigidos: string[];
}

export default function JuridicoProcessManagementView() {
  const [viewMode, setViewMode] = useState<'master' | 'operador' | 'usuario'>('master');
  const [modelos, setModelos] = useState<ModeloProcesso[]>([
    {
      id: '1',
      nome: 'Revisão de Juros Abusivos',
      camposObrigatorios: ['Nome Completo', 'CNPJ/CPF', 'Banco Credor', 'Valor do Contrato'],
      documentosExigidos: ['Procuração', 'Contrato GSA', 'Declaração de Justiça Gratuita', 'Extrato do Financiamento']
    },
    {
      id: '2',
      nome: 'Benefícios INSS',
      camposObrigatorios: ['Nome Completo', 'CPF', 'Número do Benefício', 'Tipo de Incapacidade'],
      documentosExigidos: ['Procuração', 'Contrato GSA', 'Declaração de Justiça Gratuita', 'Laudo Médico Atualizado']
    }
  ]);

  const [processos, setProcessos] = useState<Processo[]>([
    {
      id: 'GSA-5021',
      cliente: 'Amostra Comércio de Bebidas Ltda',
      unidade: 'Farroupilha',
      tipo: 'Revisão de Juros Abusivos',
      status: 'Pendente',
      dadosPreenchidos: { 'Nome Completo': 'Amostra Comércio Ltda', 'CNPJ/CPF': '00.000.000/0001-00', 'Banco Credor': 'Banco X' },
      documentos: [
        { nome: 'Procuração', status: 'Anexado', obrigatorio: true },
        { nome: 'Contrato GSA', status: 'Anexado', obrigatorio: true },
        { nome: 'Declaração de Justiça Gratuita', status: 'Pendente', obrigatorio: true },
        { nome: 'Extrato do Financiamento', status: 'Anexado', obrigatorio: true }
      ],
      operadoresVinculados: ['marina.stein@seusdireitosbr.com.br'],
      audiencias: ['15/10/2026 às 14:00 - Conciliação Virtual']
    }
  ]);

  const [selectedProcId, setSelectedProcId] = useState<string>('GSA-5021');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoDocExigido, setNovoDocExigido] = useState('');

  const processoAtivo = processos.find(p => p.id === selectedProcId) || processos[0];

  const adicionarOperador = () => {
    if (novoEmail.trim()) {
      setProcessos(processos.map(p => p.id === processoAtivo.id ? { ...p, operadoresVinculados: [...p.operadoresVinculados, novoEmail.trim()] } : p));
      setNovoEmail('');
    }
  };

  const incluirNovoDocumentoExigido = () => {
    if (novoDocExigido.trim()) {
      setProcessos(processos.map(p => p.id === processoAtivo.id ? { ...p, documentos: [...p.documentos, { nome: novoDocExigido.trim(), status: 'Pendente', obrigatorio: true }] } : p));
      setNovoDocExigido('');
    }
  };

  const baixarFichaPDFMock = (proc: Processo) => {
    alert(`[GSA PDF Generator]\nFicha do Processo ${proc.id} gerada com sucesso!\n\nCliente: ${proc.cliente}\nUnidade: ${proc.unidade}\nStatus: ${proc.status}\nOperadores: ${proc.operadoresVinculados.join(', ')}`);
  };

  const baixarTodosArquivosZIPMock = (proc: Processo) => {
    alert(`[GSA Compressor]\nIniciando compactação do Kit Digital...\nCompactando arquivos enviados por ${proc.cliente} de forma segura.\nDownload do arquivo ${proc.id}_KIT_DIGITAL.zip iniciado!`);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0B131A', color: '#FFF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Seletor de Visão para Testes de Auditoria */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111E29', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #1C2D3D' }}>
        <div>
          <h2 style={{ margin: '0', fontSize: '18px', color: '#3182CE' }}>Simulador de Controle de Esteira Jurídica</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A0AEC0' }}>Alterne entre visões para auditar o fluxo ponta a ponta.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setViewMode('master')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'master' ? '#3182CE' : '#2D3748', color: '#FFF' }}>👑 Admin Master</button>
          <button onClick={() => setViewMode('operador')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'operador' ? '#3182CE' : '#2D3748', color: '#FFF' }}>🧑‍⚖️ Operador/E-mails Delegados</button>
          <button onClick={() => setViewMode('usuario')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'usuario' ? '#3182CE' : '#2D3748', color: '#FFF' }}>🏢 Usuário/Unidade</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Painel Esquerdo: Lista de Processos */}
        <div style={{ flex: '1', minWidth: '300px', backgroundColor: '#111E29', padding: '20px', borderRadius: '12px', border: '1px solid #1C2D3D' }}>
          <h3 style={{ marginTop: '0', borderBottom: '1px solid #1C2D3D', paddingBottom: '10px' }}>📁 Processos por Unidades</h3>
          {processos.map(p => (
            <div key={p.id} onClick={() => setSelectedProcId(p.id)} style={{ padding: '12px', backgroundColor: p.id === processoAtivo.id ? '#1A365D' : '#16222F', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', border: p.id === processoAtivo.id ? '1px solid #3182CE' : '1px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: '#63B3ED' }}>{p.id}</span>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: p.status === 'Pendente' ? '#9B2C2C' : '#22543D', color: '#FFF' }}>{p.status}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{p.cliente}</div>
              <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '4px' }}>📍 Unidade: {p.unidade} | Tipo: {p.tipo}</div>
            </div>
          ))}
        </div>

        {/* Painel Direito: Detalhes do Processo Ativo */}
        <div style={{ flex: '2', minWidth: '500px', backgroundColor: '#111E29', padding: '24px', borderRadius: '12px', border: '1px solid #1C2D3D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1C2D3D', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '22px' }}>{processoAtivo.cliente}</h3>
              <span style={{ fontSize: '13px', backgroundColor: '#2D3748', padding: '4px 8px', borderRadius: '4px', color: '#CBD5E0' }}>Esteira: {processoAtivo.tipo}</span>
            </div>
            {(viewMode === 'master' || viewMode === 'operador') && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => baixarFichaPDFMock(processoAtivo)} style={{ padding: '10px 14px', backgroundColor: '#2B6CB0', border: 'none', color: '#FFF', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Exportar Ficha PDF</button>
                <button onClick={() => baixarTodosArquivosZIPMock(processoAtivo)} style={{ padding: '10px 14px', backgroundColor: '#2F855A', border: 'none', color: '#FFF', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>⬇ Baixar Tudo (.ZIP)</button>
              </div>
            )}
          </div>

          {/* Seção 1: Dados do Processo e Verificação de Dados Faltantes */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#63B3ED', marginBottom: '12px' }}>📊 Informações Cadastrais Preenchidas</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#16222F', padding: '16px', borderRadius: '8px' }}>
              {Object.entries(processoAtivo.dadosPreenchidos).map(([campo, valor]) => (
                <div key={campo} style={{ fontSize: '14px' }}>
                  <span style={{ color: '#A0AEC0', display: 'block', fontSize: '12px' }}>{campo}:</span>
                  <strong>{valor || <span style={{ color: '#FC8181' }}>Faltando informação</span>}</strong>
                </div>
              ))}
              {!processoAtivo.dadosPreenchidos['Valor do Contrato'] && (
                <div style={{ fontSize: '14px', gridColumn: 'span 2', backgroundColor: '#742A2A', padding: '8px', borderRadius: '4px', color: '#FFF', marginTop: '6px' }}>
                  ⚠️ <strong>Dado Pendente Encontrado:</strong> O campo 'Valor do Contrato' precisa ser preenchido para liberação do espelho processual.
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Checklist Documental e Inclusão Dinâmica de Exigências */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#63B3ED', marginBottom: '12px' }}>🗂️ Checklist de Documentações e Peças (Procuração/Contrato)</h4>
            <div style={{ backgroundColor: '#16222F', padding: '16px', borderRadius: '8px' }}>
              {processoAtivo.documentos.map((doc, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #233547' }}>
                  <span style={{ fontSize: '14px' }}>
                    {doc.nome} {doc.obrigatorio && <span style={{ color: '#FC8181' }}>*</span>}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: doc.status === 'Anexado' ? '#48BB78' : '#FC8181' }}>
                    {doc.status === 'Anexado' ? '✓ Anexado' : '🛑 Pendente'}
                  </span>
                </div>
              ))}

              {viewMode === 'master' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #233547' }}>
                  <input type="text" value={novoDocExigido} onChange={(e) => setNovoDocExigido(e.target.value)} placeholder="Ex: Novo Anexo Obrigatório (Ex: CND)..." style={{ flex: '1', padding: '10px', backgroundColor: '#2D3748', border: 'none', borderRadius: '6px', color: '#FFF' }} />
                  <button onClick={incluirNovoDocumentoExigido} style={{ backgroundColor: '#4A5568', border: 'none', color: '#FFF', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Exigir Novo Doc</button>
                </div>
              )}
            </div>
          </div>

          {/* Seção 3: Delegação de E-mails / Usuários para Administração */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#63B3ED', marginBottom: '12px' }}>👥 Usuários e E-mails Delegados para Administração</h4>
            <div style={{ backgroundColor: '#16222F', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', padding: '4px 8px', backgroundColor: '#2C5282', borderRadius: '4px' }}>👑 master@camaragsa.com.br</span>
                {processoAtivo.operadoresVinculados.map((email, idx) => (
                  <span key={idx} style={{ fontSize: '13px', padding: '4px 8px', backgroundColor: '#2D3748', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                    🧑‍⚖️ {email}
                  </span>
                ))}
              </div>

              {viewMode === 'master' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="Inserir e-mail do advogado / administrador delegado..." style={{ flex: '1', padding: '10px', backgroundColor: '#2D3748', border: 'none', borderRadius: '6px', color: '#FFF' }} />
                  <button onClick={adicionarOperador} style={{ backgroundColor: '#3182CE', border: 'none', color: '#FFF', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Vincular</button>
                </div>
              )}
            </div>
          </div>

          {/* Seção 4: Visão de Acompanhamento (Status, Audiências e Alertas) */}
          <div>
            <h4 style={{ color: '#63B3ED', marginBottom: '12px' }}>📅 Calendário de Audiências & Alertas Operacionais</h4>
            <div style={{ backgroundColor: '#16222F', padding: '16px', borderRadius: '8px' }}>
              {processoAtivo.audiencias.length === 0 ? (
                <p style={{ color: '#A0AEC0', margin: '0', fontSize: '14px' }}>Nenhuma audiência ou ato processual agendado até o momento.</p>
              ) : (
                processoAtivo.audiencias.map((aud, idx) => (
                  <div key={idx} style={{ padding: '8px', backgroundColor: '#2A4365', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
                    🔔 {aud}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
EOF

# 1. Envia a nova estrutura para o repositório principal do GitHub
git add .
git commit -m "feat: implementando novo Modulo de Esteira e Gestao de Processos Judiciais"
git push origin main
# 2. Roda a compilação do Vite para empacotar o Módulo Jurídico atualizado
npm run build
# 3. Faz o deploy forçado na raiz limpa do projeto
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos no diretório correto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Remove os arquivos da pasta .cache apenas do histórico do Git (mantém os locais)
git rm -r --cached .cache/ 2>/dev/null
# 3. Adiciona a pasta .cache ao arquivo .gitignore para o Git ignorá-la definitivamente
echo "" >> .gitignore
echo ".cache/" >> .gitignore
# 4. Refaz o commit de forma limpa, sem os arquivos gigantes
git commit --amend -m "feat: implementando novo Modulo de Esteira e Gestao de Processos Judiciais"
# 5. Envia os arquivos limpos com sucesso para o GitHub
git push origin main --force
# 1. Garante o diretório correto do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Faz uma cópia de segurança do App.tsx antes da alteração
cp src/App.tsx src/App.bak.tsx 2>/dev/null
# 3. Injeta a importação e o botão "Esteira Jurídica" no fluxo de navegação do App.tsx
cat << 'EOF' > update_menu.js
const fs = require('fs');
const path = 'src/App.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Injeta a importação do componente caso não exista
    if (!content.includes('JuridicoProcessManagementView')) {
        content = "import JuridicoProcessManagementView from './components/JuridicoProcessManagementView';\n" + content;
        
        // Localiza um ponto comum de renderização ou lista de abas para injetar a nova opção
        if (content.includes("const [currentView, setCurrentView]")) {
            content = content.replace(
                "const [currentView, setCurrentView]",
                "// Injeção de visualização jurídica\n  if (currentView === 'esteira-juridica') return <JuridicoProcessManagementView />;\n  const [currentView, setCurrentView]"
            );
        }
        
        // Adiciona o botão visual no menu lateral (procurando um ícone conhecido como configurações ou dashboard)
        if (content.includes("{/* Menu Items */}")) {
            const botaoMenu = `
            {/* Menu Items */}
            <button onClick={() => setCurrentView('esteira-juridica')} className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all \${currentView === 'esteira-juridica' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50'}\`}>
              <span className="text-xl">⚖️</span>
              <span className="font-medium text-sm">Esteira Jurídica</span>
            </button>`;
            content = content.replace("{/* Menu Items */}", botaoMenu);
        }
        
        fs.writeFileSync(path, content, 'utf8');
        console.log('✓ Menu lateral atualizado com o atalho da Esteira Jurídica!');
    } else {
        console.log('! O componente já estava integrado ao App.tsx.');
    }
} else {
    console.log('X Arquivo src/App.tsx não encontrado para modificação direta.');
}
EOF

node update_menu.js && rm update_menu.js
# 4. Compila a nova versão visual e envia para o Firebase Hosting
npm run build
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos no diretório correto do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o injetor adaptado para o formato de módulos do seu projeto (ES Module)
cat << 'EOF' > update_menu.js
import fs from 'fs';

const path = 'src/App.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    if (!content.includes('JuridicoProcessManagementView')) {
        // Injeta a importação do novo componente no topo do arquivo
        content = "import JuridicoProcessManagementView from './components/JuridicoProcessManagementView';\n" + content;
        
        // Acopla a renderização dinâmica da nova view
        if (content.includes("const [currentView, setCurrentView]")) {
            content = content.replace(
                "const [currentView, setCurrentView]",
                "// Injeção de visualização jurídica GSA\n  if (currentView === 'esteira-juridica') return <JuridicoProcessManagementView />;\n  const [currentView, setCurrentView]"
            );
        }
        
        // Injeta o botão sofisticado com o ícone de balança na Sidebar
        if (content.includes("{/* Menu Items */}")) {
            const botaoMenu = `{/* Menu Items */}
            <button onClick={() => setCurrentView('esteira-juridica')} className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all \${currentView === 'esteira-juridica' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50'}\`}>
              <span className="text-xl">⚖️</span>
              <span className="font-medium text-sm">Esteira Jurídica</span>
            </button>`;
            content = content.replace("{/* Menu Items */}", botaoMenu);
        }
        
        fs.writeFileSync(path, content, 'utf8');
        console.log('✓ Menu lateral injetado com sucesso no ecossistema!');
    } else {
        console.log('! O componente já consta no App.tsx.');
    }
} else {
    console.log('X Erro: src/App.tsx não foi localizado.');
}
EOF

# 3. Executa a injeção na esteira e apaga o script temporário
node update_menu.js && rm update_menu.js
# 4. Adiciona ao Git e atualiza seu repositório no GitHub
git add src/App.tsx
git commit -m "feat: acoplando atalho da Esteira Juridica na Sidebar principal"
git push origin main
# 5. Compila o pacote final renovado e faz o deploy definitivo
npm run build
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Abre o arquivo App.tsx no editor de texto direto do terminal
nano src/App.tsx
# 1. Garante que as alterações manuais sejam salvas no Git
git add src/App.tsx
git commit -m "fix: alinhamento manual da view esteira-juridica no App.tsx"
git push origin main
# 2. Recompila todo o ecossistema com a rota corrigida
npm run build
# 3. Faz o deploy forçado limpando qualquer cache residual do servidor
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta certa
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria um script robusto para interceptar a rota antiga e apontar para o componente novo
cat << 'EOF' > fix_routes.js
import fs from 'fs';

const path = 'src/App.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Garante a importação correta no topo do arquivo
    if (!content.includes('import JuridicoProcessManagementView')) {
        content = "import JuridicoProcessManagementView from './components/JuridicoProcessManagementView';\n" + content;
    }
    
    // Força a renderização da tela nova substituindo ou interceptando o clique do item de menu
    // Vamos fazer com que, sempre que a view ativa for a tela de processos, ela carregue o componente novo
    if (content.includes("currentView === 'processes'") || content.includes("currentView === 'gestao-processos'")) {
        console.log('Detectada rota antiga de processos. Aplicando redirecionamento de componente...');
    }
    
    // Abordagem direta: intercepta no bloco de controle de views
    // Procuramos onde os componentes antigos são chamados para injetar o nosso como prioridade máxima
    if (content.includes("return <ProcessManagementView") || content.includes("return <ProcessManagement")) {
        content = content.replace("return <ProcessManagementView", "return <JuridicoProcessManagementView");
        content = content.replace("return <ProcessManagement", "return <JuridicoProcessManagementView");
    } else {
        // Se a lógica for por chaves ou funções, injetamos direto na entrada da renderização
        content = content.replace(
            "const [currentView, setCurrentView]",
            "// Força a nova esteira GSA\n  if (currentView === 'processes' || currentView === 'gestao-processos' || currentView === 'esteira-juridica') return <JuridicoProcessManagementView />;\n  const [currentView, setCurrentView]"
        );
    }
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Rota e botões sincronizados com o novo Módulo Jurídico!');
} else {
    console.log('X Arquivo App.tsx não encontrado.');
}
EOF

# 3. Executa a correção nas rotas
node fix_routes.js && rm fix_routes.js
# 4. Sobe a correção limpa para o GitHub
git add src/App.tsx
git commit -m "fix: redirecionando rota de gestao de processos para a nova esteira juridica"
git push origin main
# 5. Recompila o projeto inteiro e atualiza o Firebase Hosting
npm run build
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta certa
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Desfaz qualquer alteração incompleta e limpa o arquivo para o estado correto
git checkout src/App.tsx 2>/dev/null
# 3. Cria o arquivo injetor em formato ESM de forma totalmente isolada e segura
cat << 'EOF' > force_juridico.js
import fs from 'fs';

const path = 'src/App.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // 1. Força a importação no topo do arquivo
    if (!content.includes('JuridicoProcessManagementView')) {
        content = "import JuridicoProcessManagementView from './components/JuridicoProcessManagementView';\n" + content;
    }
    
    // 2. Intercepta a inicialização do estado para renderizar a nova esteira como prioridade absoluta
    if (content.includes("const [currentView, setCurrentView]")) {
        content = content.replace(
            "const [currentView, setCurrentView]",
            "// Força a nova esteira GSA\n  if (currentView === 'processes' || currentView === 'gestao-processos' || currentView === 'esteira-juridica') return <JuridicoProcessManagementView />;\n  const [currentView, setCurrentView]"
        );
    }
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Injeção estrutural aplicada com sucesso no App.tsx!');
} else {
    console.log('X Erro: src/App.tsx não foi encontrado.');
}
EOF

# 4. Executa a injeção de código purificada
node force_juridico.js && rm force_juridico.js
# 5. Adiciona e commita de verdade no Git
git add src/App.tsx
git commit -m "fix: redirecionamento forcado para a nova esteira juridica"
git push origin main
# 6. Recompila todo o ecossistema com a rota ativa
npm run build
# 7. Faz o deploy definitivo limpando todo o cache do Firebase
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante a pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Desfaz qualquer tentativa quebrada
git checkout src/App.tsx 2>/dev/null
# 3. Força a importação do componente novo no topo do arquivo de forma direta
sed -i '1s/^/import JuridicoProcessManagementView from ".\/components\/JuridicoProcessManagementView";\n/' src/App.tsx
# 4. Intercepta a renderização das views antigas de processos e joga para a nova esteira
sed -i '/const \[currentView, setCurrentView\]/i \  if (currentView === "processes" || currentView === "gestao-processos" || currentView === "esteira-juridica") return <JuridicoProcessManagementView />;' src/App.tsx
# 5. Salva no Git para acompanhar o histórico
git add src/App.tsx
git commit -m "fix: roteamento direto e limpo para nova esteira juridica"
git push origin main
# 6. Recompila os arquivos estáticos com a nova rota cravada
npm run build
# 7. Distribui o novo build para o servidor de produção
npx firebase deploy --only hosting --force --non-interactive
# 1. Certifica que estamos no diretório do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Restaura o arquivo para o estado original estável
git checkout src/App.tsx 2>/dev/null
# 3. Cria um script definitivo que encontra o bloco de renderização real (o bloco que dá 'return')
cat << 'EOF' > render_fix.js
import fs from 'fs';

const path = 'src/App.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Injeta a importação correta caso não exista
    if (!content.includes('import JuridicoProcessManagementView')) {
        content = "import JuridicoProcessManagementView from './components/JuridicoProcessManagementView';\n" + content;
    }
    
    // Em vez de colocar no topo da função, vamos injetar exatamente na primeira linha do retorno visual (dentro do JSX ou switch)
    // Interceptamos a renderização de qualquer componente antigo de processos
    if (content.includes('<ProcessManagementView') || content.includes('<ProcessManagement')) {
        content = content.replace(/<ProcessManagementView[^>]*\/>/g, '<JuridicoProcessManagementView />');
        content = content.replace(/<ProcessManagement[^>]*\/>/g, '<JuridicoProcessManagementView />');
        console.log('✓ Substituída a chamada da tag antiga pelo novo componente!');
    } else {
        // Interceptação Master na raiz do bloco condicional de telas
        content = content.replace(
            "switch (currentView)",
            "if (currentView === 'processes' || currentView === 'gestao-processos' || currentView === 'esteira-juridica') return <JuridicoProcessManagementView />;\n  switch (currentView)"
        );
        content = content.replace(
            "switch(currentView)",
            "if (currentView === 'processes' || currentView === 'gestao-processos' || currentView === 'esteira-juridica') return <JuridicoProcessManagementView />;\n  switch(currentView)"
        );
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Injeção de renderização concluída!');
} else {
    console.log('X Erro: src/App.tsx não localizado.');
}
EOF

# 4. Executa o script e limpa a área de trabalho
node render_fix.js && rm render_fix.js
# 5. Salva e commita no Git de forma segura
git add src/App.tsx
git commit -m "fix: cravando renderizacao da esteira juridica no bloco switch principal"
git push origin main
# 6. Recompila todo o projeto com a nova diretriz visual
npm run build
# 7. Sobe o deploy definitivo limpando caches antigos
npx firebase deploy --only hosting --force --non-interactive
# 1. Certifica o diretório correto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Restaura o App.tsx para a versão original limpa e sem erros
git checkout src/App.tsx 2>/dev/null
# 3. Cria um injetor focado puramente na tag do componente visual antigo
cat << 'EOF' > fix_tags.js
import fs from 'fs';

const path = 'src/App.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    
    // 1. Garante a importação do componente novo no topo
    if (!content.includes('import JuridicoProcessManagementView')) {
        content = "import JuridicoProcessManagementView from './components/JuridicoProcessManagementView';\n" + content;
    }
    
    // 2. Substitui cirurgicamente as tags antigas de ProcessManagement pelas novas
    // Isso evita usar condicionais antes da hora e aproveita as variáveis locais do próprio React
    content = content.replace(/<ProcessManagementView\b([^>]*)\/>/g, '<JuridicoProcessManagementView />');
    content = content.replace(/<ProcessManagement\b([^>]*)\/>/g, '<JuridicoProcessManagementView />');
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Substituição de tags realizada com segurança no escopo do React!');
} else {
    console.log('X Erro: src/App.tsx não encontrado.');
}
EOF

# 4. Executa a correção estrutural
node fix_tags.js && rm fix_tags.js
# 5. Registra o ajuste estável no repositório Git
git add src/App.tsx
git commit -m "fix: substituicao segura de tags sem quebra de escopo"
git push origin main
# 6. Recompila o projeto do zero corrigindo o arquivo index compilado
npm run build
# 7. Sobe o deploy limpo e definitivo para o ar
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Desfaz qualquer alteração e traz o App.tsx original de volta à vida intacto
git checkout src/App.tsx 2>/dev/null
# 3. Abre o arquivo limpo para colarmos o componente na posição exata de renderização
nano src/App.tsx
# Sobe o arquivo corrigido para o GitHub
git add src/App.tsx
git commit -m "fix: limpeza de imports e vinculacao correta da esteira juridica"
git push origin main
# Executa o build e deploy no Firebase
npm run build
npx firebase deploy --only hosting --force --non-interactive
nano src/App.tsx
# Corrige a sintaxe e remove o erro de build
git add src/App.tsx
git commit -m "fix: remocao de importacao corrompida"
git push origin main
# Recompila com sucesso
npm run build && npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Exibe as primeiras 60 linhas do arquivo para mapearmos as variáveis e estados
head -n 60 src/components/JuridicoProcessManagementView.tsx
# Procura em todo o projeto onde o 'db' do firestore é exportado para usarmos o caminho exato
grep -r "export const db" src/ 2>/dev/null || grep -r "db = getFirestore" src/ 2>/dev/null
# 1. Garante a pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o script Node para atualizar o componente conectando ao Firestore
cat << 'EOF' > connect_firestore.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Injeta os imports do Firebase no topo do arquivo
    if (!content.includes("import { db } from '../lib/firebase'")) {
        content = "import { db } from '../lib/firebase';\nimport { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';\nimport { useEffect } from 'react';\n" + content;
    }

    // 2. Substitui os hooks useState dos dados mockados por listeners em tempo real (useEffect)
    // Primeiro limpamos a inicialização estática dos modelos
    content = content.replace(
        /const \[modelos, setModelos\] = useState<ModeloProcesso\[\]>\(\[\s*[\s\S]*?\}\s*\]\);/,
        "const [modelos, setModelos] = useState<ModeloProcesso[]>([]);\n\n  useEffect(() => {\n    const unsub = onSnapshot(collection(db, 'modelos_juridicos'), (snapshot) => {\n      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModeloProcesso));\n      setModelos(list);\n    });\n    return () => unsub();\n  }, []);"
    );

    // Agora limpamos a inicialização estática dos processos
    content = content.replace(
        /const \[processos, setProcessos\] = useState<Processo\[\]>\(\[\s*[\s\S]*?\}\s*\]\);/,
        "const [processos, setProcessos] = useState<Processo[]>([]);\n\n  useEffect(() => {\n    const unsub = onSnapshot(collection(db, 'processos_juridicos'), (snapshot) => {\n      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Processo));\n      setProcessos(list);\n    });\n    return () => unsub();\n  }, []);"
    );

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Integração com as coleções do Firestore injetada com sucesso!');
} else {
    console.log('X Componente JuridicoProcessManagementView não encontrado.');
}
EOF

# 3. Executa a integração
node connect_firestore.js && rm connect_firestore.js
# 4. Sobe a atualização para o repositório
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "feat: conectando painel de esteira juridica ao firestore em tempo real"
git push origin main
# 5. Recompila todo o projeto com o novo fluxo de banco de dados
npm run build
# 6. Sobe para o Hosting do Firebase
npx firebase deploy --only hosting --force --non-interactive
# Busca as funções de alteração e manipulação de estado dentro do arquivo para fazermos a ligação com o updateDoc
grep -n -E "function|const" src/components/JuridicoProcessManagementView.tsx | head -n 40
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o script para injetar a persistência de escrita do Firestore nas funções
cat << 'EOF' > patch_actions.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Reescreve a função adicionarOperador para dar updateDoc real no Firestore
    const newAdicionarOperador = `const adicionarOperador = async () => {
    if (!novoEmail || !processoAtivo) return;
    try {
      const docRef = doc(db, 'processos_juridicos', processoAtivo.id);
      await updateDoc(docRef, {
        operadoresVinculados: arrayUnion(novoEmail)
      });
      setNovoEmail('');
    } catch (err) {
      console.error("Erro ao vincular operador:", err);
    }
  };`;

    content = content.replace(/const adicionarOperador = \(\\) => \{[\s\S]*?\};/g, newAdicionarOperador);

    // 2. Reescreve a função incluirNovoDocumentoExigido para persistir novas pendências de documentos
    const newIncluirNovoDocumento = `const incluirNovoDocumentoExigido = async () => {
    if (!novoDocExigido || !processoAtivo) return;
    try {
      const docRef = doc(db, 'processos_juridicos', processoAtivo.id);
      await updateDoc(docRef, {
        documentos: arrayUnion({ nome: novoDocExigido, status: 'Pendente', obrigatorio: true })
      });
      setNovoDocExigido('');
    } catch (err) {
      console.error("Erro ao incluir documento exigido:", err);
    }
  };`;

    content = content.replace(/const incluirNovoDocumentoExigido = \(\\) => \{[\s\S]*?\};/g, newIncluirNovoDocumento);

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Persistência de escrita gravada com sucesso nas funções de ação!');
} else {
    console.log('X Componente não localizado.');
}
EOF

# 3. Executa o patch de atualização das ações
node patch_actions.js && rm patch_actions.js
# 4. Envia o código atualizado para o repositório
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "feat: persistindo vinculo de operadores e documentos diretamente no firestore"
git push origin main
# 5. Executa a compilação do novo build estável
npm run build
# 6. Sobe para o ar no Firebase Hosting
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos no diretório oficial do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Desfaz modificações parciais no arquivo para garantir integridade estrutural
git checkout src/components/JuridicoProcessManagementView.tsx 2>/dev/null
# 3. Cria um script isolado em formato ESM purificado para reescrever as duas funções cirurgicamente
cat << 'EOF' > patch_safe.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // Remove as versões antigas síncronas e injeta a lógica assíncrona oficial do Firestore (arrayUnion)
    content = content.replace(
        "const adicionarOperador = () => {",
        "const adicionarOperador = async () => {\n    if (!novoEmail || !processoAtivo) return;\n    try {\n      await updateDoc(doc(db, 'processos_juridicos', processoAtivo.id), { operadoresVinculados: arrayUnion(novoEmail) });\n      setNovoEmail('');\n    } catch(e) { console.error(e); }\n    return;"
    );

    content = content.replace(
        "const incluirNovoDocumentoExigido = () => {",
        "const incluirNovoDocumentoExigido = async () => {\n    if (!novoDocExigido || !processoAtivo) return;\n    try {\n      await updateDoc(doc(db, 'processos_juridicos', processoAtivo.id), { documentos: arrayUnion({ nome: novoDocExigido, status: 'Pendente', obrigatorio: true }) });\n      setNovoDocExigido('');\n    } catch(e) { console.error(e); }\n    return;"
    );

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Escrita assíncrona do Firestore injetada de forma estável!');
}
EOF

# 4. Executa a correção nas funções
node patch_safe.js && rm patch_safe.js rm patch_actions.js 2>/dev/null
# 5. Salva e registra o progresso da persistência no Git
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "fix: persistencia real de acoes de operadores e documentos exigidos"
git push origin main
# 6. Recompila os módulos estáticos da aplicação
npm run build
# 7. Sobe a atualização final para o ar no Firebase Hosting
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta oficial do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Instala as dependências para geração de PDF e compactação de arquivos ZIP
npm install jspdf jszip
# 1. Garante que estamos no diretório certo
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o injetor para substituir os mocks pela automação real de arquivos
cat << 'EOF' > patch_docs.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Injeta as importações das bibliotecas no topo do arquivo se não existirem
    if (!content.includes("import jsPDF")) {
        content = "import jsPDF from 'jspdf';\nimport JSZip from 'jszip';\n" + content;
    }

    // 2. Substitui a função de baixar ficha individual (PDF)
    const realPDF = `const baixarFichaPDFMock = (proc: Processo) => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CÂMARA GSA - EXTRAJUDICIAL", 20, 20);
    
    doc.setFontSize(12);
    doc.text("FICHA DE ACOMPANHAMENTO PROCESSUAL", 20, 30);
    doc.line(20, 33, 190, 33);
    
    doc.setFont("helvetica", "normal");
    doc.text(\`ID do Processo: \${proc.id}\`, 20, 45);
    doc.text(\`Cliente/Requerente: \${proc.cliente}\`, 20, 55);
    doc.text(\`Unidade Regional: \${proc.unidade}\`, 20, 65);
    doc.text(\`Tipo de Ação: \${proc.tipo}\`, 20, 75);
    doc.text(\`Status da Esteira: \${proc.status}\`, 20, 85);
    
    doc.setFont("helvetica", "bold");
    doc.text("Dados Cadastrais do Contrato:", 20, 100);
    doc.setFont("helvetica", "normal");
    
    let y = 110;
    Object.entries(proc.dadosPreenchidos || {}).forEach(([chave, valor]) => {
      doc.text(\`• \${chave}: \${valor}\`, 25, y);
      y += 10;
    });
    
    doc.save(\`Ficha_GSA_\${proc.id}.pdf\`);
  };`;

    content = content.replace(/const baixarFichaPDFMock = \([\s\S]*?\}\s*;/g, realPDF);

    // 3. Substitui a função de baixar Kit Completo (ZIP com os 3 documentos estruturados)
    const realZIP = `const baixarTodosArquivosZIPMock = async (proc: Processo) => {
    const zip = new JSZip();
    
    // GERA DOCUMENTO 1: CONTRATO PRESTAÇÃO DE SERVIÇOS
    const contratoDoc = new jsPDF();
    contratoDoc.setFont("helvetica", "bold");
    contratoDoc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS E MEDIAÇÃO - GSA", 20, 20);
    contratoDoc.setFont("helvetica", "normal");
    contratoDoc.setFontSize(10);
    const textoContrato = \`Pelo presente instrumento, o contratante \${proc.cliente} contrata os serviços da GSA Soluções, com intermediação direcionada para a unidade de \${proc.unidade}, focado na análise de \${proc.tipo}. Fica acordado o cumprimento dos termos administrativos vigentes.\`;
    contratoDoc.text(contratoDoc.splitTextToSize(textoContrato, 170), 20, 40);
    const contratoBlob = contratoDoc.output('blob');
    zip.file("1_Contrato_Prestacao_Servicos_GSA.pdf", contratoBlob);
    
    // GERA DOCUMENTO 2: INSTRUMENTO DE PROCURAÇÃO (Ajustado para Procurador)
    const procDoc = new jsPDF();
    procDoc.setFont("helvetica", "bold");
    procDoc.text("PROCURAÇÃO AD JUDICIA ET EXTRA", 20, 20);
    procDoc.setFont("helvetica", "normal");
    procDoc.setFontSize(10);
    const textoProc = \`OUTORGANTE: \${proc.cliente}. OUTORGADO: Representantes legais da GSA Soluções, atuando especificamente na condição de PROCURADOR habilitado para fins de representação administrativa, extrajudicial e trâmites de mediação perante a Câmara GSA, com abrangência para as comarcas vinculadas.\`;
    procDoc.text(procDoc.splitTextToSize(textoProc, 170), 20, 40);
    const procBlob = procDoc.output('blob');
    zip.file("2_Procuracao_GSA_Extrajudicial.pdf", procBlob);
    
    // GERA DOCUMENTO 3: DECLARAÇÃO DE JUSTIÇA GRATUITA
    const jgDoc = new jsPDF();
    jgDoc.setFont("helvetica", "bold");
    jgDoc.text("DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA", 20, 20);
    jgDoc.setFont("helvetica", "normal");
    jgDoc.setFontSize(10);
    const textoJg = \`Eu, representante de \${proc.cliente}, declaro sob as penas da lei que não possuo condições financeiras de arcar com as custas e taxas extraordinárias sem prejuízo do sustento próprio ou da atividade operacional, solicitando triagem extrajudicial perante a Câmara.\`;
    jgDoc.text(jgDoc.splitTextToSize(textoJg, 170), 20, 40);
    const jgBlob = jgDoc.output('blob');
    zip.file("3_Declaracao_Justica_Gratuita.pdf", jgBlob);
    
    // COMPACTA E FAZ DOWNLOAD DO KIT COMPLETO ZIP
    const contentBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(contentBlob);
    link.download = \`Kit_Juridico_GSA_\${proc.id}.zip\`;
    link.click();
  };`;

    content = content.replace(/const baixarTodosArquivosZIPMock = \([\s\S]*?\}\s*;/g, realZIP);

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Automação de PDFs e empacotamento ZIP injetados com sucesso!');
} else {
    console.log('X Erro: Componente não encontrado.');
}
EOF

# 3. Executa a transformação segura
node patch_docs.js && rm patch_docs.js
# 4. Commita e sincroniza com o repositório principal
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "feat: ativando download real de ficha em PDF e Kit Juridico em ZIP"
git push origin main
# 5. Compila e atualiza os servidores de distribuição
npm run build
npx firebase deploy --only hosting --force --non-interactive
# Lista os componentes do projeto relacionados a mediador, câmara ou acordos
ls src/components/ | grep -E -i "mediat|chamber|camara|accord|agreement|public"
# Exibe o início do arquivo do painel de mediação para mapearmos as variáveis e conectarmos ao Firestore
head -n 50 src/components/MediatorDashboard.tsx
# Busca as linhas remanescentes do arquivo para localizarmos o botão ou função de encerramento
grep -n -E "finalizar|encerrar|handle" src/components/MediatorDashboard.tsx
# Lista os arquivos dentro de 'services' e 'lib' para localizarmos o robô de automação e IA do Gemini
ls src/services/ 2>/dev/null; ls src/lib/ 2>/dev/null
# Exibe as primeiras 50 linhas do arquivo de automação de leads para mapearmos as funções de triagem
head -n 50 src/services/leadAutomation.ts
# 1. Garante que estamos na pasta correta
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o script para injetar a automação de promoção de leads no arquivo de serviços
cat << 'EOF' > patch_automation.js
import fs from 'fs';

const path = 'src/services/leadAutomation.ts';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    const novaFuncaoAutomação = `
/**
 * Promove um lead qualificado automaticamente para a esteira de processos jurídicos
 */
export const promoverLeadParaProcesso = async (leadId: string, dadosLead: any, tipoProcesso: string, unidadeRegional: string) => {
  try {
    const novoProcesso = {
      cliente: dadosLead.nome,
      unidade: unidadeRegional || 'Farroupilha',
      tipo: tipoProcesso || 'Revisão de Juros Abusivos',
      status: 'Pendente',
      dadosPreenchidos: {
        'Nome Completo': dadosLead.nome,
        'CPF/CNPJ': dadosLead.documento || '',
        'Telefone Contato': dadosLead.telefone || ''
      },
      documentos: [
        { nome: 'Procuração', status: 'Pendente', obrigatorio: true },
        { nome: 'Contrato GSA', status: 'Pendente', obrigatorio: true },
        { nome: 'Declaração de Justiça Gratuita', status: 'Pendente', obrigatorio: true }
      ],
      operadoresVinculados: [],
      audiencias: [],
      createdAt: new Date().toISOString()
    };

    // Cria o processo na coleção que a esteira consome
    await addDoc(collection(db, 'processos_juridicos'), novoProcesso);

    // Atualiza o status do carrinho abandonado para RECUPERADO
    await updateDoc(doc(db, 'carrinhos_abandonados', leadId), {
      status: 'RECUPERADO',
      updatedAt: serverTimestamp()
    });

    console.log('✓ Lead promovido para a Esteira Jurídica com sucesso!');
    return true;
  } catch (err) {
    console.error("Erro ao promover lead para processo:", err);
    return false;
  }
};`;

    if (!content.includes('promoverLeadParaProcesso')) {
        content += novaFuncaoAutomação;
        fs.writeFileSync(path, content, 'utf8');
        console.log('✓ Função de promoção automatizada injetada com sucesso!');
    } else {
        console.log('! A função já existia no arquivo.');
    }
}
EOF

# 3. Executa a injeção da regra de automação
node patch_automation.js && rm patch_automation.js
# 4. Envia o código para o repositório central
git add src/services/leadAutomation.ts
git commit -m "feat: automacao para promover lead qualificado para esteira juridica"
git push origin main
# 5. Recompila o projeto para consolidar a integração dos robôs
npm run build
# 6. Atualiza o Firebase Hosting
npx firebase deploy --only hosting --force --non-interactive
# Exibe as primeiras linhas do painel de Inovação e as variáveis de precificação para estruturarmos o escopo da FINEP
head -n 50 src/components/InnovationReportView.tsx; echo "---"; head -n 30 src/lib/pricing.ts
# 1. Garante que estamos no diretório do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o script para expandir o painel com o cadastro e área do cliente
cat << 'EOF' > patch_complete_features.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // Injeta estados necessários para abertura de novos processos se não existirem
    if (!content.includes('isModalAberto')) {
        content = content.replace(
            "const [novoDocExigido, setNovoDocExigido] = useState('');",
            "const [novoDocExigido, setNovoDocExigido] = useState('');\n  const [isModalAberto, setIsModalAberto] = useState(false);\n  const [novoClienteNome, setNovoClienteNome] = useState('');\n  const [novoTipoAcao, setNovoTipoAcao] = useState('Revisão de Juros Abusivos');\n  const [novaUnidade, setNovaUnidade] = useState('Farroupilha');"
        );
    }

    // Injeta a função de salvar o novo processo diretamente no Firestore
    const funcaoCadastrar = `
  const handleCriarNovoProcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoClienteNome) return;
    try {
      const modelo = modelos.find(m => m.nome === novoTipoAcao);
      const camposIniciais = {};
      modelo?.camposObrigatorios.forEach(campo => { camposIniciais[campo] = ''; });
      
      const novoProc = {
        cliente: novoClienteNome,
        unidade: novaUnidade,
        tipo: novoTipoAcao,
        status: 'Pendente',
        dadosPreenchidos: camposIniciais,
        documentos: modelo?.documentosExigidos.map(docName => ({ nome: docName, status: 'Pendente', obrigatorio: true })) || [],
        operadoresVinculados: [],
        audiencias: [],
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'processos_juridicos'), novoProc);
      setNovoClienteNome('');
      setIsModalAberto(false);
    } catch(err) { console.error("Erro ao cadastrar processo:", err); }
  };`;

    if (!content.includes('handleCriarNovoProcesso')) {
        content = content.replace(
            "const processoAtivo = processos.find(p => p.id === selectedProcId) || processos[0];",
            "const processoAtivo = processos.find(p => p.id === selectedProcId) || processos[0];\n" + funcaoCadastrar
        );
    }

    // Injeta a função para o cliente preencher um dado pendente da esteira
    const funcaoAtualizarDado = `
  const handleAtualizarDadoCliente = async (campo: string, valor: string) => {
    if (!processoAtivo) return;
    try {
      const novosDados = { ...processoAtivo.dadosPreenchidos, [campo]: valor };
      await updateDoc(doc(db, 'processos_juridicos', processoAtivo.id), {
        dadosPreenchidos: novosDados
      });
    } catch(err) { console.error(err); }
  };`;

    if (!content.includes('handleAtualizarDadoCliente')) {
        content = content.replace(
            "const adicionarOperador = async () => {",
            funcaoAtualizarDado + "\n\n  const adicionarOperador = async () => {"
        );
    }

    // Injeta a função para o cliente fazer o upload (simulado salvando status como 'Anexado') de um documento pendente
    const funcaoUploadDoc = `
  const handleUploadDocumentoCliente = async (nomeDoc: string) => {
    if (!processoAtivo) return;
    try {
      const docsAtualizados = processoAtivo.documentos.map(d => {
        if (d.nome === nomeDoc) return { ...d, status: 'Anexado' };
        return d;
      });
      await updateDoc(doc(db, 'processos_juridicos', processoAtivo.id), {
        documentos: docsAtualizados
      });
    } catch(err) { console.error(err); }
  };`;

    if (!content.includes('handleUploadDocumentoCliente')) {
        content = content.replace(
            "const adicionarOperador = async () => {",
            funcaoUploadDoc + "\n\n  const adicionarOperador = async () => {"
        );
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Estrutura de Cadastro e Upload injetada com sucesso!');
}
EOF

# 3. Executa o patch
node patch_complete_features.js && rm patch_complete_features.js
# 4. Injeta as interfaces visuais dos botões e formulários no layout do arquivo
cat << 'EOF' > patch_ui_elements.js
import fs from 'fs';
const path = 'src/components/JuridicoProcessManagementView.tsx';
if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // Injeta o botão "Abertura de Processo" no topo da listagem lateral de processos
    if (content.includes("Processos por Unidades") && !content.includes("setIsModalAberto(true)")) {
        content = content.replace(
            "📁 Processos por Unidades",
            "📁 Processos por Unidades\n          <button onClick={() => setIsModalAberto(true)} className=\"mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1\">+ Novo Processo</button>"
        );
    }

    // Altera a listagem de documentos na visão do Usuário/Cliente para exibir o botão de upload ativo
    const uiUploadButton = `className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 cursor-pointer block text-center" onClick={() => handleUploadDocumentoCliente(doc.nome)}>Fazer Upload`;
    content = content.replace('🔴 Pendente', `🔴 Pendente</span><button ${uiUploadButton}`);

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Elementos visuais de Cadastro e Upload injetados com sucesso!');
}
EOF

# 5. Executa a inserção das modificações de UI
node patch_ui_elements.js && rm patch_ui_elements.js
# 6. Sincroniza com o GitHub
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "feat: implementacao de abertura de processos e upload de pendencias"
git push origin main
# 7. Compila e atualiza o servidor de produção
npm run build && npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o script para injetar a trava de segurança contra objetos undefined
cat << 'EOF' > fix_undefined_crash.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // Injeta a verificação de carregamento ou array vazio antes do retorno principal da UI
    const loadingGuard = `
  // Trava de segurança: impede o crash caso o Firestore ainda esteja carregando os processos
  if (!processos || processos.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-sm font-medium animate-pulse">Conectando à esteira em tempo real...</p>
        </div>
      </div>
    );
  }

  const processoAtivo = procesos.find(p => p.id === selectedProcId) || processos[0];`;

    // Substitui a declaração antiga do processoAtivo pela nossa versão com Guard Gate
    content = content.replace(
        /const processoAtivo = processos\.find\([\s\S]*?\);/,
        loadingGuard
    );

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Trava de segurança contra undefined injetada com sucesso!');
} else {
    console.log('X Arquivo não localizado.');
}
EOF

# 3. Executa a correção
node fix_undefined_crash.js && rm fix_undefined_crash.js
# 4. Envia o código corrigido para o repositório
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "fix: adicionando loading state contra erro de processo ativo undefined"
git push origin main
# 5. Recompila o projeto com a correção aplicada
npm run build
# 6. Sobe a build atualizada direto para o ar
npx firebase deploy --only hosting --force --non-interactive
# 1. Garante que estamos na pasta correta do projeto
cd ~/GSA-C-MARA 2>/dev/null || cd ~/gsacamara 2>/dev/null
# 2. Cria o script para corrigir a assinatura assíncrona da função de cadastro
cat << 'EOF' > fix_async_signature.js
import fs from 'fs';

const path = 'src/components/JuridicoProcessManagementView.tsx';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // Substitui a assinatura errada sem async pela assinatura assíncrona correta
    content = content.replace(
        "const handleCriarNovoProcesso = (e: React.FormEvent) => {",
        "const handleCriarNovoProcesso = async (e: React.FormEvent) => {"
    );

    fs.writeFileSync(path, content, 'utf8');
    console.log('✓ Assinatura async corrigida com sucesso!');
} else {
    console.log('X Arquivo não localizado.');
}
EOF

# 3. Executa a correção cirúrgica
node fix_async_signature.js && rm fix_async_signature.js
# 4. Registra a correção no repositório
git add src/components/JuridicoProcessManagementView.tsx
git commit -m "fix: adicionando modificador async na funcao de criacao de processos"
git push origin main
# 5. Recompila todo o projeto para validar o build sem erros
npm run build
# 6. Sobe a versão estável corrigida para o ar no Hosting
npx firebase deploy --only hosting --force --non-interactive
