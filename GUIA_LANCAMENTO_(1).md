# 🚀 Guia de Lançamento - GSA Câmara & Mediação

Este documento detalha os passos técnicos e estratégicos para colocar o sistema em produção com foco na captação online e análise automática.

---

## 1. ⚙️ Configuração de Infraestrutura

### 🌐 DNS & Domínio
* **Apontamento Principal:** Configure a zona de DNS (A Record ou CNAME) para o servidor Cloud Run / Vercel.
* **SSL/TLS:** Garanta que o certificado esteja ativo (HTTPS é obrigatório para integração com Asaas e Firebase).

### 🔑 Variáveis de Ambiente (.env)
Configure as seguintes chaves no painel de administração da sua hospedagem:

```env
# Inteligência Artificial
GEMINI_API_KEY=sua_chave_aqui

# Meio de Pagamento (Asaas)
# Sandbox: inicia com $aach_
# Produção: inicia com outro padrão
ASAAS_API_KEY=sua_chave_asaas
ASAAS_WEBHOOK_TOKEN=seu_token_customizado_para_seguranca

# Firebase (Server Side Admin - Opcional se usar Admin SDK)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## 2. 💳 Configuração de Pagamentos (Asaas)

### 🧪 Fase de Testes (Sandbox)
1. Crie uma conta em [sandbox.asaas.com](https://sandbox.asaas.com).
2. Gere uma API Key e configure a variável `ASAAS_API_KEY`.
3. Verifique se as cobranças PIX estão sendo geradas corretamente no fluxo do App Online.

### 🔴 Fase de Produção
1. Realize o KYC (envio de documentos) na conta oficial do Asaas.
2. Troque a API Key para a chave de produção.
3. Altere o valor da análise se desejar (atualmente R$ 47,00).

---

## 3. 🔔 Webhooks (Automação de Baixa)

O Webhook é essencial para que o sistema saiba quando o cliente pagou sem intervenção humana.

1. No painel do Asaas, vá em **Configurações > Integrações > Webhooks**.
2. URL do Webhook: `https://seu-dominio.com/api/webhook/asaas`
3. Token de Segurança: Defina o mesmo valor colocado em `ASAAS_WEBHOOK_TOKEN`.
4. Eventos Recomendados:
   - `PAYMENT_RECEIVED` (Pagamento recebido)
   - `PAYMENT_CONFIRMED` (Pagamento confirmado - cartão)

---

## 4. ✅ Checklist de Testes Recomendados

1. **Fluxo de Captação:** Realize um quiz completo, verifique se a IA gerou o score e se abriu o checkout do Asaas.
2. **Simulação de Webhook:** Use ferramentas como `curl` ou Postman para enviar um payload fake ao seu webhook e ver se o status do Lead muda para `EM_ANALISE` no `leads-online`.
3. **Login do Cliente:** Acesse `/acesso-cliente`, peça o token e verifique se o Dashboard abre com os dados corretos do Firestore.
4. **Segurança de Banco:** Verifique as `firestore.rules` para garantir que um cliente não consiga ler dados de outro sem o `leadId`.

---

## 5. 📈 Estratégia de Escala

* **Meta Ads:** Direcione tráfego diretamente para `/analise-online`. O quiz curto garante alta conversão (micro-compromissos).
* **Remarketing:** Leads que não pagaram podem ser abordados via WhatsApp manualmente através da lista de "ANALISADO" no Admin.
* **Automação Extra:** Integre o Webhook para disparar uma mensagem automática via API do WhatsApp quando o status mudar para `EM_ANALISE`.

---

**GSA Câmara - Inovação Jurídica & Resolução Inteligente**
