import { JurimetricsEngine } from './server/services/JurimetricsEngine';
import { JurimetricsService } from './server/services/JurimetricsService';

async function run() {
  console.log("Starting Engine...");
  try {
    const res1 = await JurimetricsEngine.analisarPreditividade({
      banco_contrato: "Banco Bradesco",
      tipo_acao: "Revisional de Juros"
    });
    console.log("Engine success!");
    console.log(res1);
  } catch (e) {
    console.error("Engine error:", e);
  }

  console.log("Starting Service...");
  try {
    const res2 = await JurimetricsService.calculatePredictability("Banco Itaú");
    console.log("Service success!");
    console.log(res2);
  } catch (e) {
    console.error("Service error:", e);
  }
  process.exit(0);
}
run();
