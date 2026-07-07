import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './server/lib/firebase';

// Importação de todas as Rotas
import configRoutes from './server/routes/config';
import leadRoutes from './server/routes/leads';
import processRoutes from './server/routes/processes';
import paymentRoutes from './server/routes/payments';
import aiRoutes from './server/routes/ai';
import cronRoutes from './server/routes/cron';
import notificationRoutes from './server/routes/notifications';
import arRoutes from './server/routes/ar';
import userRoutes from './server/routes/users';
import webhookRoutes from './server/routes/webhooks';
import uploadRoutes from './server/routes/uploads';
import recoveryRoutes from './server/routes/recovery'; // ADICIONADO: Importação do GSA Recovery
import negotiationRoutes from './server/routes/negotiation'; // ADICIONADO: Importação do Bot de Conciliação Ativa
import b2bRoutes from './server/routes/b2b';
import analyticsRoutes from './server/routes/analytics';
import jurimetricsRoutes from './server/routes/jurimetrics';
import executionRoutes from './server/routes/execution';
import biddingRoutes from './server/routes/bidding';
import vitrineRoutes from './server/routes/vitrine';
import leadManagementRoutes from './server/routes/lead-management';
import financeRoutes from './server/routes/finance';
import assinaturaRoutes from './server/routes/assinatura';
import adminRoutes from './server/routes/admin';

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = process.env.VITE_APP_URL 
  ? [process.env.VITE_APP_URL, 'http://localhost:3000', 'http://localhost:5173'] 
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const apiRouter = express.Router();

apiRouter.get('/status', (req, res) => {
  res.json({ 
    status: 'online', 
    database: db ? 'connected' : 'disconnected', 
    ai: !!process.env.GEMINI_API_KEY 
  });
});

apiRouter.use((req, res, next) => {
  if (!db) return res.status(503).json({ error: "Banco de dados indisponível." });
  next();
});

// Vinculação de sub-rotas na API do Express
apiRouter.use('/config', configRoutes);
apiRouter.use('/leads', leadRoutes);
apiRouter.use('/processos', processRoutes);
apiRouter.use('/', paymentRoutes); 
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/cron', cronRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/ar', arRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/recovery', recoveryRoutes); // ADICIONADO: Ativado no servidor de produção
apiRouter.use('/negotiation', negotiationRoutes); // ADICIONADO: Bot de Conciliação Ativa
apiRouter.use('/b2b', b2bRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/jurimetrics', jurimetricsRoutes);
apiRouter.use('/execution', executionRoutes);
apiRouter.use('/bidding', biddingRoutes);
apiRouter.use('/vitrine', vitrineRoutes);
apiRouter.use('/lead-management', leadManagementRoutes);
apiRouter.use('/finance', financeRoutes);
apiRouter.use('/assinatura', assinaturaRoutes);
apiRouter.use('/admin', adminRoutes);

app.use('/api', apiRouter);

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: "Rota API não encontrada no servidor", path: req.originalUrl });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  } else {
    next(err);
  }
});

async function serveFrontend() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

serveFrontend();

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Câmara GSA online na porta ${PORT}`);
  });
}

export default app;
