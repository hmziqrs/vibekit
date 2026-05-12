CREATE TABLE webhook_endpoint (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE cascade,
  url text NOT NULL,
  secret text NOT NULL,
  events text NOT NULL,
  description text,
  active integer DEFAULT 1 NOT NULL,
  created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE INDEX webhook_endpoint_user_idx ON webhook_endpoint(user_id);
CREATE INDEX webhook_endpoint_active_idx ON webhook_endpoint(active);

CREATE TABLE webhook_delivery (
  id text PRIMARY KEY NOT NULL,
  endpoint_id text NOT NULL REFERENCES webhook_endpoint(id) ON DELETE cascade,
  event_type text NOT NULL,
  payload text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  status_code integer,
  response_body text,
  attempt_count integer DEFAULT 0 NOT NULL,
  next_retry_at integer,
  created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE INDEX webhook_delivery_endpoint_idx ON webhook_delivery(endpoint_id);
CREATE INDEX webhook_delivery_status_idx ON webhook_delivery(status, created_at);
CREATE INDEX webhook_delivery_event_type_idx ON webhook_delivery(event_type, created_at);
