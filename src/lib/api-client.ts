// Petit client HTTP pour appeler notre propre API v1 depuis le navigateur.
// Un futur client mobile appellera les memes endpoints, en remplacant juste
// l'authentification par cookie par un token Bearer Clerk.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.error ?? `Erreur ${res.status}`);
  }

  return body as T;
}
