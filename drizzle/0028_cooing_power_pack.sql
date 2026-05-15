ALTER TABLE `invoice` ADD `tax_amount_in_cents` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `subscription_plan` ADD `tax_inclusive` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_plan` ADD `tax_rate` integer;