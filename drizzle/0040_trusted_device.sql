CREATE TABLE IF NOT EXISTS `trusted_device` (
  `id` text NOT NULL PRIMARY KEY,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `token_hash` text NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX IF NOT EXISTS `trusted_device_user_idx` ON `trusted_device`(`user_id`);
CREATE INDEX IF NOT EXISTS `trusted_device_expires_idx` ON `trusted_device`(`expires_at`);
