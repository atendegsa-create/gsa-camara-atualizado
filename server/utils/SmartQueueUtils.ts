import { WhatsAppAntiSpamConfig } from '../../src/types';

export class SmartQueueUtils {
  /**
   * Promisified delay helper.
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Returns a random delay in milliseconds between min and max seconds.
   */
  static getRandomDelay(minSeconds: number, maxSeconds: number): number {
    const min = minSeconds * 1000;
    const max = maxSeconds * 1000;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Checks if the current time is within the allowed days and hours window.
   */
  static isAllowedTime(config: WhatsAppAntiSpamConfig): boolean {
    if (!config.active) return true;
    
    const now = new Date();
    const day = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hour = now.getHours();

    if (config.allowedDays && !config.allowedDays.includes(day)) {
      return false;
    }

    if (hour < config.startHour || hour >= config.endHour) {
      return false;
    }

    return true;
  }

  /**
   * Sleeps in 1-minute increments until the current time is within the allowed window.
   */
  static async waitUntilAllowedWindow(config: WhatsAppAntiSpamConfig): Promise<void> {
    if (!config.active) return;

    while (!this.isAllowedTime(config)) {
      const now = new Date();
      console.log(`[Anti-Spam] Fora da janela de disparo permitida. Dia: ${now.getDay()}, Hora: ${now.getHours()}h. Hibernando por 60 segundos...`);
      await this.sleep(60 * 1000);
    }
  }
}
