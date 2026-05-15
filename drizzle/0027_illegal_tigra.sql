CREATE TABLE `coupon` (
	`active` integer DEFAULT true NOT NULL,
	`code` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`currency` text(3),
	`duration` text DEFAULT 'once' NOT NULL,
	`duration_in_months` integer,
	`id` text PRIMARY KEY NOT NULL,
	`max_redemptions` integer,
	`name` text NOT NULL,
	`percent_off` integer,
	`redeem_by` integer,
	`stripe_coupon_id` text,
	`times_redeemed` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`valid` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupon_code_unique` ON `coupon` (`code`);