ALTER TABLE `contact_submission` ADD `type` text DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;