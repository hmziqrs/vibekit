-- Subscription Plans
CREATE TABLE subscription_plan (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_in_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval TEXT NOT NULL CHECK(interval IN ('month', 'year')),
  trial_days INTEGER NOT NULL DEFAULT 0,
  features TEXT,
  stripe_price_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX subscription_plan_slug_idx ON subscription_plan(slug);

-- Subscriptions
CREATE TABLE subscription (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plan(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK(status IN ('active', 'canceled', 'incomplete', 'past_due', 'paused', 'trialing')),
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  trial_end INTEGER,
  canceled_at INTEGER,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX subscription_user_idx ON subscription(user_id);
CREATE INDEX subscription_org_idx ON subscription(organization_id);
CREATE INDEX subscription_status_idx ON subscription(status);

-- Subscription Events (audit trail)
CREATE TABLE subscription_event (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('created', 'upgraded', 'downgraded', 'canceled', 'renewed', 'trial_started', 'trial_ended', 'past_due', 'payment_failed')),
  from_plan_id TEXT,
  to_plan_id TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Usage Records (metered billing)
CREATE TABLE usage_record (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK(metric_type IN ('api_calls', 'storage', 'seats', 'requests')),
  quantity INTEGER NOT NULL DEFAULT 0,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Invoices
CREATE TABLE invoice (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  organization_id TEXT,
  subscription_id TEXT REFERENCES subscription(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  amount_in_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date INTEGER,
  paid_at INTEGER,
  pdf_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Payment Methods
CREATE TABLE payment_method (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('card', 'bank_transfer')),
  last4 TEXT,
  brand TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Seed default plans
INSERT INTO subscription_plan (id, name, slug, description, price_in_cents, currency, interval, trial_days, features, is_active, sort_order)
VALUES
  ('plan_starter', 'Starter', 'starter', 'Get started with the basics', 0, 'usd', 'month', 0, '["5 items","Basic analytics","Community support"]', 1, 0),
  ('plan_pro', 'Pro', 'pro', 'Everything you need to grow', 2900, 'usd', 'month', 14, '["Unlimited items","Advanced analytics","Priority support","API access","Custom integrations"]', 1, 1);
