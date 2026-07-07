# GSA Câmara - Mediação & Conciliação

Plataforma de Conciliação, Mediação e Arbitragem focada em RX do Consignado e alta conversão de acordos.

## 🚀 Sobre o Projeto

O **GSA Câmara** é uma solução LegalTech SaaS estruturada para facilitar a justiça financeira através de mediação extrajudicial. O sistema permite o diagnóstico de viabilidade jurídica, acompanhamento de processos e gestão de acordos de forma eficiente.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite, Tailwind CSS, Motion (animações)
- **Backend/API**: Node.js (Express) integrações com Firebase
- **Inteligência Artificial**: Google Gemini API para diagnósticos estratégicos
- **Banco de Dados**: Firebase Firestore

## 📂 Estrutura do Projeto

- `/src`: Código fonte da aplicação frontend (React)
- `/server.ts`: Servidor Express para lógica de backend
- `/functions`: Firebase Cloud Functions para processamentos em segundo plano
- `firestore.rules`: Regras de segurança para o banco de dados

## 🌐 Domínio & SSL

O projeto está configurado para operar preferencialmente sob o subdomínio: **gsacamara.72hrs.info**.

### Corrigindo o erro `SSL_PROTOCOL_ERROR`:
Se você visualizar este erro ao acessar o site:
1. **Verificação de DNS**: Certifique-se de que o domínio ou subdomínio está apontado para o IP correto da sua hospedagem (Vercel/Firebase).
2. **Certificado SSL**: No painel da sua hospedagem (ex: Vercel em **Settings > Domains**), certifique-se de que o domínio foi adicionado e que o status do certificado é "Valid".
3. **Propagação**: Alterações de DNS podem levar de alguns minutos a algumas horas para propagar.

## 📝 Como Exportar para GitHub

Para manter este repositório sincronizado:
1. Vá ao menu de configurações do **Google AI Studio**.
2. Selecione a opção **Export to GitHub**.
3. Escolha o repositório `gsacamara/GSA-C-MARA`.

---
*Sistema Oficial de Conciliação & Mediação Extrajudicial*
