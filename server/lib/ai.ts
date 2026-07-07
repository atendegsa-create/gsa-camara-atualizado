import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const googleAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const ai = googleAI;

// --- SIMPLE RATE LIMITING QUEUE FOR GEMINI ---
type AIRequest = () => Promise<any>;

class AIQueue {
  private queue: { request: AIRequest; resolve: (val: any) => void; reject: (err: any) => void; fallbackValue?: any }[] = [];
  private running = 0;
  private maxConcurrent = 2; // Ajuste conforme a cota (Gemini Free tem limites baixos)
  private minInterval = 1000; // 1 segundo entre chamadas para evitar picos
  private lastCall = 0;

  async add<T>(request: AIRequest, fallbackValue?: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject, fallbackValue });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    const now = Date.now();
    const waitTime = Math.max(0, this.minInterval - (now - this.lastCall));

    if (waitTime > 0) {
      setTimeout(() => this.process(), waitTime);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    this.lastCall = Date.now();

    try {
      const result = await item.request();
      item.resolve(result);
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.status === 429;
      if (isQuotaError && item.fallbackValue !== undefined) {
        console.warn("AI Quota exceeded, using fallback value.");
        item.resolve(item.fallbackValue);
      } else {
        item.reject(error);
      }
    } finally {
      this.running--;
      this.process();
    }
  }
}

export const aiQueue = new AIQueue();

/**
 * Helper para executar chamadas de IA com fila e rate-limit
 */
export async function executeAI<T>(fn: AIRequest, fallbackValue?: T): Promise<T> {
  return aiQueue.add<T>(fn, fallbackValue);
}
