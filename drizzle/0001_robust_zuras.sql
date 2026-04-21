DROP TABLE `task`;--> statement-breakpoint
ALTER TABLE `user` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `last_login_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `deleted_at` integer;