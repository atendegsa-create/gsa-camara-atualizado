import { auditRX } from './src/services/geminiService';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await auditRX("Teste de extrato banco BMG com rmc de 100 reais.");
    console.log("Success:", res);
  } catch (e: any) {
    console.error("Failed:", e.message);
    if (e.statusDetails) console.error(JSON.stringify(e.statusDetails, null, 2));
    if (e.response) console.error(JSON.stringify(e.response, null, 2));
  }
}
run();
