import "server-only";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY manquant");
  return key;
}

type InitializeTransactionParams = {
  email: string;
  amountFcfa: number;
  planCode?: string;
  organizationId: string;
  callbackUrl: string;
};

// Paystack attend le montant dans la plus petite unite de la devise.
// Pour XOF/FCFA (devise zero-decimale), la plus petite unite = 1 FCFA,
// donc pas de x100 comme pour NGN/GHS/ZAR.
export async function initializeTransaction(params: InitializeTransactionParams) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountFcfa,
      currency: "XOF",
      plan: params.planCode,
      callback_url: params.callbackUrl,
      metadata: { organizationId: params.organizationId },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Echec de l'initialisation du paiement Paystack");
  }

  return data.data as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Echec de la verification Paystack");
  }
  return data.data;
}
