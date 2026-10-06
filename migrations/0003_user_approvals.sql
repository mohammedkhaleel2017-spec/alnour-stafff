-- User approvals and roles for Al Nour staff system
CREATE TABLE IF NOT EXISTS user_approvals (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  is_approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_approvals_role_idx ON user_approvals (role);
CREATE INDEX IF NOT EXISTS user_approvals_approved_idx ON user_approvals (is_approved);
