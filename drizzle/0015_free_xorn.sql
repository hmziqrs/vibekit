ALTER TABLE `user` ADD `onboarding_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `onboarding_step` integer DEFAULT 0;