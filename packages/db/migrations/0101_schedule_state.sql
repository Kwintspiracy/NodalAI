-- schedule_state — l'état d'une routine entre deux exécutions.
-- Voir packages/db/src/schema/schedule-state.ts pour le pourquoi (doublon
-- Discord du 08/09/2026 : l'état vivait dans la mémoire sémantique).
CREATE TABLE IF NOT EXISTS schedule_state (
  schedule_id uuid NOT NULL REFERENCES agent_schedules(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_state_pkey PRIMARY KEY (schedule_id, key),
  CONSTRAINT schedule_state_key_len CHECK (length(key) BETWEEN 1 AND 120),
  CONSTRAINT schedule_state_value_len CHECK (length(value) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_schedule_state_schedule ON schedule_state (schedule_id);
