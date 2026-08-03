"use client";

// File d'attente locale pour les ventes saisies hors-ligne. Pas de sync
// generalisee (pas d'IndexedDB/CRDT) : juste ce qu'il faut pour que le
// barman puisse continuer a enregistrer des ventes quand le reseau tombe
// en plein service, et que tout parte automatiquement des que la
// connexion revient. En cas d'echec de synchro (ex: stock insuffisant
// entre temps), la vente reste en file avec son erreur — a arbitrer
// manuellement, pas ecrasee silencieusement.

const STORAGE_KEY = "serveo:offline-sales-queue";

export type QueuedSale = {
  localId: string;
  productId: string;
  productName: string;
  quantity: number;
  discount: number;
  paymentMethod: string;
  queuedAt: string;
  lastError?: string;
};

export type NewQueuedSale = Omit<QueuedSale, "localId" | "queuedAt" | "lastError">;

function readQueue(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSale[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSale[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function getQueue(): QueuedSale[] {
  return readQueue();
}

export function enqueueSale(sale: NewQueuedSale): QueuedSale {
  const queued: QueuedSale = {
    ...sale,
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(queued);
  writeQueue(queue);
  return queued;
}

function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter((s) => s.localId !== localId));
}

function markError(localId: string, message: string) {
  writeQueue(readQueue().map((s) => (s.localId === localId ? { ...s, lastError: message } : s)));
}

// Tente d'envoyer chaque vente en attente au serveur, dans l'ordre de
// saisie. S'arrete sur une erreur reseau (probablement toujours hors-ligne)
// mais continue sur une erreur metier (ex: stock insuffisant) en la
// signalant, pour ne pas bloquer les ventes suivantes indefiniment.
export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = readQueue();
  let synced = 0;
  let failed = 0;

  for (const sale of queue) {
    try {
      const res = await fetch("/api/v1/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: sale.productId,
          quantity: sale.quantity,
          discount: sale.discount,
          paymentMethod: sale.paymentMethod,
        }),
      });

      if (res.ok) {
        removeFromQueue(sale.localId);
        synced++;
        continue;
      }

      const body = await res.json().catch(() => null);
      markError(sale.localId, body?.error ?? `Erreur ${res.status}`);
      failed++;
    } catch {
      // Erreur reseau : on arrete la, probablement toujours hors-ligne.
      break;
    }
  }

  return { synced, failed };
}
