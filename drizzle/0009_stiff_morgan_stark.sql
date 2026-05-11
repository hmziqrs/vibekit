CREATE TABLE `login_attempt` (
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_attempt_at` integer NOT NULL,
	`locked_until` integer
);
