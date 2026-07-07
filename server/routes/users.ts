import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../lib/firebase';

const router = express.Router();

router.post('/criar-membro', async (req, res) => {
  try {
    const { nome, email, senha, role, tenantId } = req.body;

    if (!email || !senha || !role || !tenantId) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }

    let userRecord;
    try {
      userRecord = await getAuth().createUser({
        email,
        password: senha,
        displayName: nome,
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        // Se já existe, atualizamos o usuário com a nova senha e nome
        userRecord = await getAuth().getUserByEmail(email);
        await getAuth().updateUser(userRecord.uid, {
          password: senha,
          displayName: nome,
        });
      } else {
        throw error;
      }
    }

    // 2. Define as Custom Claims (para blindar as regras de segurança do banco)
    await getAuth().setCustomUserClaims(userRecord.uid, { tenantId, role });

    // 3. Guarda o perfil na coleção 'users' para aparecer na tabela da equipa
    await db.collection('usuarios').doc(userRecord.uid).set({
      nome_completo: nome,
      email: email,
      tipo_usuario: role,
      tenantId: tenantId,
      status: 'APROVADO',
      createdAt: new Date()
    });

    res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error("Erro ao criar utilizador:", error);
    res.status(500).json({ error: error.message || 'Erro interno.' });
  }
});

router.post('/update-password', async (req, res) => {
  try {
    const { uid, newPassword } = req.body;

    if (!uid || !newPassword) {
      return res.status(400).json({ error: 'UID e nova senha são obrigatórios.' });
    }

    await getAuth().updateUser(uid, {
      password: newPassword,
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar senha:", error);
    res.status(500).json({ error: error.message || 'Erro interno ao atualizar senha.' });
  }
});

router.post('/update-email', async (req, res) => {
  try {
    const { uid, newEmail } = req.body;

    if (!uid || !newEmail) {
      return res.status(400).json({ error: 'UID e novo e-mail são obrigatórios.' });
    }

    await getAuth().updateUser(uid, {
      email: newEmail,
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar e-mail:", error);
    res.status(500).json({ error: error.message || 'Erro interno ao atualizar e-mail.' });
  }
});

export default router;
