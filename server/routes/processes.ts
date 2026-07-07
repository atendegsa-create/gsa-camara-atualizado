import express from 'express';
import { db, admin } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';
import { enviarEmail } from '../lib/emailService';
import { ExecutionDocumentService } from '../services/ExecutionDocumentService';

const router = express.Router();

router.post('/novo', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const processData = {
      ...data,
      status: 'AGUARDANDO_PAGAMENTO',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      historico_eventos: [
        {
          data: new Date().toISOString(),
          evento: "Processo Criado via Landing Page",
          tipo: "SISTEMA"
        }
      ]
    };
    
    const docRef = await db!.collection('processos').add(processData);
    
    // Criar entrada para consulta pública (tracking)
    await db!.collection('consulta_publica').doc(docRef.id).set({
      status: 'AGUARDANDO_PAGAMENTO',
      cliente_nome: data.nome,
      tenantId: data.tenantId || 'master',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, processo: { id: docRef.id } });
  } catch (error: any) {
    console.error("Erro ao criar processo:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/atualizar', verifyToken, async (req, res) => {
  const { id, updates } = req.body;
  try {
    const processRef = db!.collection('processos').doc(id);
    const processDoc = await processRef.get();

    if (!processDoc.exists) {
      return res.status(404).json({ error: "Processo não encontrado" });
    }

    const currentData = processDoc.data();
    let finalUpdates = { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    // Lógica de Workflow Engine: AR Online Assinado -> Inicia Prazo
    if (updates.status === 'NOTIFICACAO' && updates.fase_data?.status_convite === 'ACEITO') {
      // Se acabou de ser assinado/lido
      if (currentData?.fase_data?.status_convite !== 'ACEITO') {
        const dataInicio = new Date();
        const diasPrazo = 15;
        const dataVencimento = new Date();
        dataVencimento.setDate(dataInicio.getDate() + diasPrazo);

        finalUpdates = {
          ...finalUpdates,
          data_inicio_prazo: admin.firestore.Timestamp.fromDate(dataInicio),
          prazo_dias: diasPrazo,
          data_vencimento_prazo: admin.firestore.Timestamp.fromDate(dataVencimento),
          historico_eventos: admin.firestore.FieldValue.arrayUnion({
            data: new Date().toISOString(),
            evento: "Início do prazo de 15 dias (AR Online Assinado)",
            tipo: "SISTEMA"
          })
        };
      }
    }

    await processRef.update(finalUpdates);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar processo:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/update-process/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, novaPendencia, observacao } = req.body;

    const processRef = db!.collection('juridico_processos').doc(id);
    const processDoc = await processRef.get();

    if (!processDoc.exists) return res.status(404).json({ error: "Processo não encontrado" });
    const processData = processDoc.data();

    // Atualização do status
    await processRef.update({ 
      status: status,
      ultima_atualizacao: new Date().toISOString(),
      ...(novaPendencia && { pendencias: admin.firestore.FieldValue.arrayUnion(novaPendencia) })
    });

    // NOTIFICAÇÃO AUTOMÁTICA (Gatilho de e-mail)
    // Se o advogado mudar para PENDENTE, avisa o cliente original
    if (status === 'PENDENTE') {
      await enviarEmail({
        to: processData?.criadoPor, // Supondo que criadoPor armazena o email ou precisamos buscar o email do cliente
        subject: `Atualização no seu processo: ${processData?.clienteNome || 'Desconhecido'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Olá, ${processData?.clienteNome || 'Cliente'}</h2>
            <p>O seu processo foi marcado como PENDENTE.</p>
            <p>Motivo: ${observacao || 'Verifique as novas pendências no portal.'}</p>
          </div>
        `
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar processo" });
  }
});

router.post('/gerar-execucao', verifyToken, async (req: any, res) => {
  const { processId } = req.body;
  const userId = req.user?.uid;
  const userName = req.user?.name || req.user?.email || 'Sistema/Advogado';

  if (!processId) {
    return res.status(400).json({ error: "O ID do processo é obrigatório." });
  }

  try {
    const result = await ExecutionDocumentService.generateExecutionPetition(processId, userId, userName);
    res.json(result);
  } catch (error: any) {
    console.error("Erro ao gerar petição automática:", error);
    res.status(500).json({ error: error.message || "Erro ao processar petição de execução." });
  }
});

export default router;
