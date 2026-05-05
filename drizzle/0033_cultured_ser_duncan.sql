ALTER TABLE `customer_subscriptions` MODIFY COLUMN `status` enum('active','trialing','past_due','cancelled','incomplete','paused') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `provider_subscriptions` MODIFY COLUMN `status` enum('active','trialing','past_due','cancelled','incomplete','paused') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD `pausedAt` timestamp;--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD `resumesAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_subscriptions` ADD `pausedAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_subscriptions` ADD `resumesAt` timestamp;