import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

export const verifyToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Não autorizado: Token não fornecido." });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: "Token inválido." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    res.status(401).json({ error: "Token inválido ou expirado." });
  }
};
