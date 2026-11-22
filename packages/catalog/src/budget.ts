import { QuotaExceededError, type CallGuard, type CallPurpose } from '@peque/ai';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

/**
 * Presupuesto diario de llamadas reales a la IA (carga por días, docs/specs/ingesta-datos.md).
 * Canal "admin" (rastreo y lotes) puede usar el presupuesto menos la reserva;
 * canal "family" (sugerencias bajo demanda) puede usar el total.
 */
export interface BudgetConfig {
  daily: number;
  familyReserve: number; // fracción 0-1
}

export function budgetFromEnv(env: NodeJS.ProcessEnv = process.env): BudgetConfig {
  const daily = Number(env.AI_DAILY_REQUEST_BUDGET ?? 200);
  return { daily: Number.isFinite(daily) && daily > 0 ? daily : 200, familyReserve: 0.2 };
}

export const todayKey = (now = new Date()) => now.toISOString().slice(0, 10);

export function budgetGuard(db: Firestore, channel: 'admin' | 'family', config: BudgetConfig = budgetFromEnv()): CallGuard {
  return {
    async beforeCall(purpose: CallPurpose) {
      const ref = db.collection('aiUsage').doc(todayKey());
      await db.runTransaction(async (tx) => {
        const used = ((await tx.get(ref)).get('requests') as number | undefined) ?? 0;
        const limit = channel === 'admin' ? Math.floor(config.daily * (1 - config.familyReserve)) : config.daily;
        if (used >= limit) {
          throw new QuotaExceededError(
            channel === 'admin'
              ? 'Se ha agotado el presupuesto de hoy para la carga. Continuará mañana.'
              : 'Hoy se ha alcanzado el límite de ideas de la IA. Inténtalo mañana.',
          );
        }
        tx.set(
          ref,
          {
            requests: FieldValue.increment(1),
            byPurpose: { [purpose]: FieldValue.increment(1) },
            byChannel: { [channel]: FieldValue.increment(1) },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });
    },
  };
}

export async function usageToday(db: Firestore, config: BudgetConfig = budgetFromEnv()) {
  const snap = await db.collection('aiUsage').doc(todayKey()).get();
  const used = (snap.get('requests') as number | undefined) ?? 0;
  return {
    used,
    daily: config.daily,
    adminLimit: Math.floor(config.daily * (1 - config.familyReserve)),
    byPurpose: (snap.get('byPurpose') as Record<string, number> | undefined) ?? {},
  };
}
