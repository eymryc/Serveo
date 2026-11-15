-- Garde-fous d'intégrité Phase 1–2 : une seule caisse ouverte / un seul inventaire draft par org
CREATE UNIQUE INDEX IF NOT EXISTS "cash_sessions_one_open_per_org"
  ON "cash_sessions" ("organization_id")
  WHERE "status" = 'open';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_sessions_one_draft_per_org"
  ON "inventory_sessions" ("organization_id")
  WHERE "status" = 'draft';
