CREATE TABLE `waitlist_entry` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL UNIQUE,
  `ip_address` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
CREATE INDEX `waitlist_entry_created_idx` ON `waitlist_entry` (`created_at`);
