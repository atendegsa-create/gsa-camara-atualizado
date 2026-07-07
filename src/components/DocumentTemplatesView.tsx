import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Copy, Check, Search, Filter, Printer, Share2, ClipboardList, Gavel, Scale, FileSignature, AlertCircle, Send, Award, PenTool } from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentEditor } from './DocumentEditor';

export interface Template {
  id: string;
  title: string;
  category: string;
  icon: any;
  content: string;
  description: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'contrato_premium',
    title: 'Contrato Completo Premium',
    category: 'Jurídico',
    icon: Award,
    description: 'Contrato de prestação de serviços completo com cláusulas de arbitragem e confissão de dívida.',
    content: `# PRESTAÇÃO DE SERVIÇOS DE MEDIAÇÃO, CONCILIAÇÃO E ARBITRAGEM EXTRAJUDICIAL

**CONTRATANTE**
Nome/Razão Social: {{NOME COMPLETO}}
CPF/CNPJ: {{CPF/CNPJ}}
Telefone: {{TELEFONE}}
E-mail: {{EMAIL}}
Endereço: {{ENDEREÇO COMPLETO}}

**CONTRATADA**
GSA SOLUÇÕES LTDA
CNPJ: 43.213.208/0001-00

Representada por: TIAGO MARTINS
CPF: 815.694.590-53
Endereço profissional: Avenida Independência nº 482, Sala 115, Garibaldi/RS
Telefone: (54) 99621-7400 | E-mail: atende.gsa@gmail.com

### CLÁUSULA 1 — OBJETO
O presente contrato tem como objeto a prestação de serviços especializados de mediação extrajudicial, conciliação, negociação privada, arbitragem extrajudicial, notificações extrajudiciais, intermediação de acordos, formalização de termos e assessoria administrativa extrajudicial.

### CLÁUSULA 2 — FINALIDADE
Os serviços destinam-se à tentativa de resolução consensual ou arbitral de conflitos envolvendo dívidas, cobranças, relações comerciais, contratos, negociações financeiras e conflitos civis.

### CLÁUSULA 3 — OBRIGAÇÕES DO CONTRATANTE
O CONTRATANTE obriga-se a fornecer documentos verdadeiros, comparecer às sessões, assinar procurações necessárias e efetuar pagamentos conforme pactuado.

### CLÁUSULA 4 — OBRIGAÇÕES DA CONTRATADA
A CONTRATADA compromete-se a atuar com imparcialidade, respeitar confidencialidade, conduzir sessões e formalizar acordos preservando dados conforme LGPD.

### CLÁUSULA 5 — CONFIDENCIALIDADE
Todas as informações e documentos relacionados ao procedimento possuem caráter confidencial.

### CLÁUSULA 6 — HONORÁRIOS E PAGAMENTO
**VALOR CONTRATADO:** R$ {{VALOR}}
**FORMA DE PAGAMENTO:** {{FORMA DE PAGAMENTO}}
**CONDIÇÃO:** {{CONDIÇÃO}}

### CLÁUSULA 7 — CONFISSÃO DE DÍVIDA
O CONTRATANTE reconhece expressamente todas as obrigações financeiras assumidas neste contrato, constituindo o presente instrumento em CONFISSÃO DE DÍVIDA líquida, certa e exigível (Art. 784, III do CPC).

### CLÁUSULA 8 — TÍTULO EXECUTIVO EXTRAJUDICIAL
O presente contrato possui força de título executivo extrajudicial, podendo ser executado judicialmente em caso de inadimplemento (Art. 784 do CPC).

### CLÁUSULA 9 — INADIMPLEMENTO
Em caso de atraso: multa de 10%, juros de 1% ao mês e correção monetária. O débito poderá ser encaminhado para cobrança extrajudicial, protesto ou execução judicial.

### CLÁUSULA 10 — CLÁUSULA ANTI-CHARGEBACK
O CONTRATANTE declara ciência de que os serviços possuem natureza imediata. Fica vedada tentativa de cancelamento fraudulento ou chargeback após início da execução.

### CLÁUSULA 11 — ACEITE DIGITAL
As partes reconhecem validade jurídica de assinatura eletrônica, aceite digital e confirmação via WhatsApp/E-mail (MP 2.200-2/2001).

### CLÁUSULA 12 — LIMITAÇÃO DE ATUAÇÃO
A CONTRATADA atua exclusivamente na esfera extrajudicial, administrativa e arbitral. Este contrato NÃO substitui serviços advocatícios privativos da OAB.

### CLÁUSULA 13 — CIÊNCIA DE RISCO
O CONTRATANTE declara ciência de que mediação e conciliação dependem de consenso e não existe garantia absoluta de êxito.

### CLÁUSULA 14 — CLÁUSULA COMPROMISSÓRIA ARBITRAL
As partes elegem a Câmara de Mediação e Arbitragem da GSA SOLUÇÕES para resolver conflitos oriundos deste contrato (Lei nº 9.307/1996).

### CLÁUSULA 15 — RESCISÃO
O contrato poderá ser rescindido por inadimplemento ou acordo. Valores pagos não serão devolvidos após início da execução operacional.

### CLÁUSULA 16 — LGPD
As partes autorizam tratamento de dados pessoais pessoalmente para execução contratual.

### CLÁUSULA 17 — FORO
Fica eleito o foro da comarca de Farroupilha/RS para medidas judiciais não submetidas à arbitragem.

---
**TERMO DE CONFISSÃO DE DÍVIDA**
Eu, {{NOME}}, CPF/CNPJ {{CPF}}, reconheço expressamente ser devedor da quantia de R$ {{VALOR}}, referente aos serviços contratados junto à GSA SOLUÇÕES LTDA. Reconheço que a dívida é líquida, certa e exigível.

**TERMO DE ACORDO EXTRAJUDICIAL**
OBJETO: ________________________________________________
CONDIÇÕES: _____________________________________________
PRAZO: _________________________________________________
MULTA POR DESCUMPRIMENTO: ______________________________

**TERMO DE ACEITE DIGITAL**
O CONTRATANTE declara que leu integralmente o contrato e concorda com a assinatura eletrônica via WhatsApp/E-mail.`
  },
  {
    id: 'regulamento',
    title: 'Estatuto / Regulamento da Câmara',
    category: 'Institucional',
    icon: Gavel,
    description: 'Documento base que institui as regras da Câmara GSA.',
    content: `# REGULAMENTO DA CÂMARA PRIVADA DE MEDIAÇÃO, CONCILIAÇÃO E ARBITRAGEM - GSA SOLUÇÕES

A GSA SOLUÇÕES, inscrita no CNPJ nº 43.213.208/0001-00, com sede na Avenida Independência nº 482, Sala 115, neste ato representada por seu sócio administrador Tiago Martins, institui o presente regulamento para disciplinar procedimentos de mediação, conciliação e arbitragem extrajudicial, nos termos da legislação brasileira.

### Art. 1 – Finalidade
A Câmara tem como finalidade promover a resolução de conflitos de forma extrajudicial, por meio de:
* Mediação
* Conciliação
* Arbitragem privada

### Art. 2 – Fundamentação Legal
Os procedimentos seguirão:
* Lei nº 13.140/2015 – Mediação
* Lei nº 9.307/1996 – Arbitragem
* Código Civil
* Código de Processo Civil

### Art. 3 – Princípios
Os procedimentos observarão:
* Imparcialidade
* Autonomia das partes
* Confidencialidade
* Boa-fé
* Celeridade
* Igualdade entre as partes

### Art. 4 – Mediadores e Árbitros
Poderão atuar como mediadores ou árbitros pessoas capazes, de confiança das partes, conforme Art. 13 da Lei de Arbitragem.

### Art. 5 – Procedimentos
Os procedimentos poderão ocorrer:
* Presencialmente
* Por videoconferência
* Por meio eletrônico

### Art. 6 – Acordos
Os acordos firmados terão natureza de título executivo extrajudicial, conforme legislação vigente.

### Art. 7 – Arbitragem
Quando houver cláusula compromissória ou compromisso arbitral, o árbitro designado poderá proferir sentença arbitral, com força de decisão judicial.`
  },
  {
    id: 'contrato_servicos',
    title: 'Contrato de Prestação de Serviços',
    category: 'Jurídico',
    icon: FileSignature,
    description: 'Contrato padrão para contratação de serviços de mediação.',
    content: `# CONTRATO DE MEDIAÇÃO, CONCILIAÇÃO E ARBITRAGEM EXTRAJUDICIAL

**CONTRATANTE:**
Nome: ______________________________
CPF/CNPJ: __________________________

**CONTRATADA:**
GSA SOLUÇÕES
CNPJ: 43.213.208/0001-00
Endereço: Avenida Independência 482 sala 115
Representante: Tiago Martins

### CLÁUSULA 1 – OBJETO
O presente contrato tem como objeto a prestação de serviços de mediação, conciliação e arbitragem extrajudicial, visando a resolução de conflitos entre as partes envolvidas.

### CLÁUSULA 2 – FUNDAMENTAÇÃO
Os serviços serão realizados conforme:
* Lei 13.140/2015
* Lei 9.307/1996

### CLÁUSULA 3 – MEDIAÇÃO
A mediação consiste na atuação de terceiro imparcial para facilitar o diálogo entre as partes.

### CLÁUSULA 4 – ARBITRAGEM
Caso as partes concordem, o conflito poderá ser submetido à arbitragem privada, onde o árbitro designado emitirá sentença arbitral.

### CLÁUSULA 5 – CONFIDENCIALIDADE
Todas as informações serão tratadas com confidencialidade, salvo autorização das partes.

### CLÁUSULA 6 – HONORÁRIOS
Os honorários pelos serviços serão definidos previamente entre as partes.

### CLÁUSULA 7 – FORO
Para questões não resolvidas por arbitragem, fica eleito o foro da comarca do domicílio das partes.`
  },
  {
    id: 'notificacao_extrajudicial',
    title: 'Notificação Extrajudicial',
    category: 'Notificação',
    icon: Send,
    description: 'Template de notificação para tentativa de mediação amigável.',
    content: `# NOTIFICAÇÃO EXTRAJUDICIAL PARA TENTATIVA DE MEDIAÇÃO

**NOTIFICANTE:**
__________________________________

**NOTIFICADO:**
__________________________________

A empresa GSA SOLUÇÕES, atuando como Câmara Privada de Mediação e Conciliação, vem por meio desta NOTIFICAR Vossa Senhoria para participar de procedimento de mediação extrajudicial, visando solução amigável do seguinte conflito:

**DESCRIÇÃO DO CONFLITO:**
__________________________________________________________________

Com fundamento na Lei nº 13.140/2015, convidamos para comparecimento em sessão de mediação:

* **Data:** ______ / ______ / ______
* **Horário:** ______ : ______
* **Local:** __________________________________ (ou por videoconferência)

O objetivo é buscar solução amigável, rápida e consensual, evitando medidas judiciais.

Caso não haja manifestação no prazo de 5 dias, o procedimento poderá seguir conforme regulamentação da Câmara.

Atenciosamente,

**GSA SOLUÇÕES**
CNPJ 43.213.208/0001-00

Tiago Martins
Mediador / Conciliador
Contato: (54) 99621-7400`
  },
  {
    id: 'termo_abertura',
    title: 'Termo de Instauração de Procedimento',
    category: 'Procedimento',
    icon: ClipboardList,
    description: 'Documento para formalizar o início do processo arbitral.',
    content: `# TERMO DE INSTAURAÇÃO DE PROCEDIMENTO ARBITRAL

Aos ___ dias do mês de ______ do ano de ______, perante a Câmara de Mediação e Arbitragem da GSA SOLUÇÕES, foi instaurado o presente procedimento arbitral entre:

**REQUERENTE:**
__________________________________

**REQUERIDO:**
__________________________________

### OBJETO DO CONFLITO
__________________________________

### FUNDAMENTAÇÃO
Nos termos da Lei nº 9.307/1996, as partes concordam em submeter o conflito à arbitragem.

### ÁRBITRO DESIGNADO
Fica designado como árbitro:
__________________________________

### PRAZO
A sentença arbitral será proferida no prazo de até 180 dias, salvo prorrogação acordada entre as partes.

### CONFIDENCIALIDADE
O procedimento será conduzido sob sigilo, salvo determinação legal.

E por estarem de acordo, assinam:

Requerente: __________________
Requerido: __________________
Árbitros: __________________

**Câmara: GSA SOLUÇÕES**`
  },
  {
    id: 'procuracao',
    title: 'Procuração (Ad Judicia)',
    category: 'Jurídico',
    icon: Scale,
    description: 'Procuração padrão para representação em processos.',
    content: `# PROCURAÇÃO AD JUDICIA ET EXTRA

**OUTORGANTE:**
[NOME DO CLIENTE], [ESTADO CIVIL], [PROFISSÃO], portador(a) do RG nº [RG] e inscrito(a) no CPF sob o nº [CPF], residente e domiciliado(a) na [ENDEREÇO COMPLETO].

**OUTORGADO:**
GSA SOLUÇÕES, CNPJ 43.213.208/0001-00, com sede na Avenida Independência nº 482, Sala 115, Passo Fundo/RS, na pessoa de seu representante ou advogados associados.

**PODERES:**
Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) seu procurador para o fim especial de representá-lo(a) junto à Câmara de Mediação e Arbitragem GSA e perante órgãos judiciais e administrativos.

**PODERES ESPECÍFICOS:**
O presente mandato confere os poderes da cláusula ad judicia et extra, outorgando ainda poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, receber, dar quitação, firmar compromissos e acordos, bem como representar o outorgante em audiências de mediação e conciliação.

[CIDADE], [DATA].

__________________________________________
Assinatura do Outorgante`
  },
  {
    id: 'termo_acordo',
    title: 'Termo de Acordo Extrajudicial',
    category: 'Acordo',
    icon: Check,
    description: 'Documento final para formalização de acordo entre as partes.',
    content: `# TERMO DE ACORDO EXTRAJUDICIAL E CONFISSÃO DE DÍVIDA

Pelo presente instrumento particular, as partes abaixo qualificadas:

**PARTE RECLAMANTE:** {{NOME COMPLETO}}, inscrito no CPF sob o nº {{CPF/CNPJ}}.
**PARTE RECLAMADA:** {{PARTE CONTRÁRIA}}, inscrita no CPF/CNPJ sob o nº {{DOCUMENTO PARTE CONTRÁRIA}}.

Resolvem formalizar o presente ACORDO EXTRAJUDICIAL, mediante as seguintes cláusulas:

### CLÁULA 1 - DO OBJETO
O presente acordo visa compor amigavelmente o conflito referente a {{OBJETO DO CONFLITO}}.

### CLÁULA 2 - DAS CONDIÇÕES
A PARTE RECLAMADA pagará à PARTE RECLAMANTE a quantia de R$ {{VALOR DO ACORDO}}, da seguinte forma:
{{CONDIÇÕES DE PAGAMENTO}}

### CLÁULA 3 - DA QUITAÇÃO
Com o cumprimento integral das obrigações acima, a PARTE RECLAMANTE dá plena, geral e irrevogável quitação.

### CLÁULA 4 - DO DESCUMPRIMENTO
O descumprimento de qualquer cláusula implicará em multa de {{MULTA}}% sobre o saldo devedor.

{{CIDADE}}, {{DATA}}.`
  }
];

export function DocumentTemplatesView() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  const categories = ['Todos', ...new Set(TEMPLATES.map(t => t.category))];

  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900 border-b-4 border-[#5A5A40] inline-block pb-1">
            Repositório de Documentos
          </h2>
          <p className="text-gray-500 mt-2 font-medium">Modelos oficiais e ferramentas para emissão de certidões e termos.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar de Seleção */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#5A5A40] outline-none text-sm transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                    categoryFilter === cat 
                      ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTemplates.map(template => {
              const Icon = template.icon;
              const isActive = selectedTemplate?.id === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left flex items-start gap-4 group",
                    isActive 
                      ? "bg-[#5A5A40] border-[#5A5A40] text-white shadow-lg" 
                      : "bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:shadow-md"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    isActive ? "bg-white/10" : "bg-gray-50 text-gray-400 group-hover:bg-[#5A5A40]/5 group-hover:text-[#5A5A40]"
                  )}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm", isActive ? "text-white" : "text-gray-900")}>{template.title}</p>
                    <p className={cn("text-[10px] line-clamp-1 mt-0.5", isActive ? "text-white/60" : "text-gray-400")}>
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visualizador de Conteúdo */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedTemplate ? (
              <motion.div
                key={selectedTemplate.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[700px]"
              >
                <div className="p-8 border-b border-gray-50 bg-[#fcfbf9] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#5A5A40] text-white rounded-2xl">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-xl text-gray-900">{selectedTemplate.title}</h3>
                      <p className="text-xs text-[#5A5A40] font-bold uppercase tracking-widest">{selectedTemplate.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCopy(selectedTemplate.content, selectedTemplate.id)}
                      className="p-3 hover:bg-gray-100 rounded-xl transition-all text-gray-600 flex items-center gap-2"
                      title="Copiar Texto"
                    >
                      {copiedId === selectedTemplate.id ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="p-3 hover:bg-gray-100 rounded-xl transition-all text-gray-600"
                      title="Imprimir"
                    >
                      <Printer size={20} />
                    </button>
                    <button 
                      className="p-3 hover:bg-gray-100 rounded-xl transition-all text-gray-600"
                      title="Compartilhar"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-12 overflow-y-auto bg-white document-preview font-serif leading-relaxed text-gray-800">
                  <div className="max-w-2xl mx-auto whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <AlertCircle size={14} />
                    Revise todos os campos destacados antes de emitir
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleCopy(selectedTemplate.content, selectedTemplate.id)}
                      className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                    >
                      {copiedId === selectedTemplate.id ? <Check size={18} /> : <Copy size={18} />}
                      {copiedId === selectedTemplate.id ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                    <button 
                      onClick={() => setEditingTemplate(selectedTemplate)}
                      className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                      <PenTool size={18} /> Preencher e Assinar
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] h-[700px] flex flex-col items-center justify-center text-center p-12">
                <FileText size={64} className="text-gray-200 mb-6" />
                <h3 className="font-serif font-bold text-xl text-gray-400">Nenhum modelo selecionado</h3>
                <p className="text-gray-400 max-w-sm mt-2">Escolha um documento na lista ao lado para visualizar e gerar o conteúdo oficial.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .document-preview, .document-preview * { visibility: visible; }
          .document-preview { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important; 
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {editingTemplate && (
        <DocumentEditor 
          template={editingTemplate} 
          onClose={() => setEditingTemplate(null)} 
        />
      )}
    </div>
  );
}
