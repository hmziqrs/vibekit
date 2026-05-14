CREATE TABLE `stripe_webhook_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`processed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_webhook_event_event_id_unique` ON `stripe_webhook_event` (`event_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice` (
	`amount_in_cents` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`currency` text(3) NOT NULL,
	`due_date` integer,
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`paid_at` integer,
	`pdf_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`stripe_invoice_id` text,
	`subscription_id` text,
	`user_id` text,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_invoice`("amount_in_cents", "created_at", "currency", "due_date", "id", "organization_id", "paid_at", "pdf_url", "status", "stripe_invoice_id", "subscription_id", "user_id") SELECT "amount_in_cents", "created_at", "currency", "due_date", "id", "organization_id", "paid_at", "pdf_url", "status", "stripe_invoice_id", "subscription_id", "user_id" FROM `invoice`;--> statement-breakpoint
DROP TABLE `invoice`;--> statement-breakpoint
ALTER TABLE `__new_invoice` RENAME TO `invoice`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_payment_method` (
	`brand` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expiry_month` integer,
	`expiry_year` integer,
	`id` text PRIMARY KEY NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last4` text,
	`stripe_payment_method_id` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_payment_method`("brand", "created_at", "expiry_month", "expiry_year", "id", "is_default", "last4", "stripe_payment_method_id", "type", "user_id") SELECT "brand", "created_at", "expiry_month", "expiry_year", "id", "is_default", "last4", "stripe_payment_method_id", "type", "user_id" FROM `payment_method`;--> statement-breakpoint
DROP TABLE `payment_method`;--> statement-breakpoint
ALTER TABLE `__new_payment_method` RENAME TO `payment_method`;--> statement-breakpoint
CREATE TABLE `__new_push_subscription` (
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`endpoint` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`p256dh` text NOT NULL,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_push_subscription`("auth", "created_at", "endpoint", "id", "p256dh", "user_agent", "user_id") SELECT "auth", "created_at", "endpoint", "id", "p256dh", "user_agent", "user_id" FROM `push_subscription`;--> statement-breakpoint
DROP TABLE `push_subscription`;--> statement-breakpoint
ALTER TABLE `__new_push_subscription` RENAME TO `push_subscription`;--> statement-breakpoint
CREATE INDEX `push_sub_user_idx` ON `push_subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `push_sub_endpoint_idx` ON `push_subscription` (`endpoint`);--> statement-breakpoint
CREATE TABLE `__new_subscription` (
	`canceled_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`current_period_end` integer NOT NULL,
	`current_period_start` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`organization_id` text,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'incomplete' NOT NULL,
	`stripe_customer_id` text,
	`stripe_price_id` text,
	`stripe_subscription_id` text,
	`trial_end` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `subscription_plan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subscription`("canceled_at", "created_at", "current_period_end", "current_period_start", "id", "metadata", "organization_id", "plan_id", "status", "stripe_customer_id", "stripe_price_id", "stripe_subscription_id", "trial_end", "updated_at", "user_id") SELECT "canceled_at", "created_at", "current_period_end", "current_period_start", "id", "metadata", "organization_id", "plan_id", "status", "stripe_customer_id", "stripe_price_id", "stripe_subscription_id", "trial_end", "updated_at", "user_id" FROM `subscription`;--> statement-breakpoint
DROP TABLE `subscription`;--> statement-breakpoint
ALTER TABLE `__new_subscription` RENAME TO `subscription`;--> statement-breakpoint
CREATE INDEX `subscription_org_idx` ON `subscription` (`organization_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_user_idx` ON `subscription` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_subscription_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`from_plan_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`subscription_id` text NOT NULL,
	`to_plan_id` text,
	`type` text NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subscription_event`("created_at", "from_plan_id", "id", "metadata", "subscription_id", "to_plan_id", "type") SELECT "created_at", "from_plan_id", "id", "metadata", "subscription_id", "to_plan_id", "type" FROM `subscription_event`;--> statement-breakpoint
DROP TABLE `subscription_event`;--> statement-breakpoint
ALTER TABLE `__new_subscription_event` RENAME TO `subscription_event`;--> statement-breakpoint
CREATE TABLE `__new_subscription_plan` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`currency` text(3) NOT NULL,
	`description` text,
	`features` text,
	`id` text PRIMARY KEY NOT NULL,
	`interval` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`price_in_cents` integer NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`stripe_price_id` text,
	`trial_days` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_subscription_plan`("created_at", "currency", "description", "features", "id", "interval", "is_active", "name", "price_in_cents", "slug", "sort_order", "stripe_price_id", "trial_days", "updated_at") SELECT "created_at", "currency", "description", "features", "id", "interval", "is_active", "name", "price_in_cents", "slug", "sort_order", "stripe_price_id", "trial_days", "updated_at" FROM `subscription_plan`;--> statement-breakpoint
DROP TABLE `subscription_plan`;--> statement-breakpoint
ALTER TABLE `__new_subscription_plan` RENAME TO `subscription_plan`;--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_plan_slug_unique` ON `subscription_plan` (`slug`);--> statement-breakpoint
CREATE INDEX `subscription_plan_slug_idx` ON `subscription_plan` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_usage_record` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metric_type` text NOT NULL,
	`period_end` integer NOT NULL,
	`period_start` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`subscription_id` text NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_usage_record`("created_at", "id", "metric_type", "period_end", "period_start", "quantity", "subscription_id") SELECT "created_at", "id", "metric_type", "period_end", "period_start", "quantity", "subscription_id" FROM `usage_record`;--> statement-breakpoint
DROP TABLE `usage_record`;--> statement-breakpoint
ALTER TABLE `__new_usage_record` RENAME TO `usage_record`;