CREATE TABLE `provider_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`tier` enum('free','basic','premium') NOT NULL DEFAULT 'free',
	`status` enum('active','trialing','past_due','cancelled','incomplete') NOT NULL DEFAULT 'active',
	`stripeSubscriptionId` varchar(255),
	`stripeCustomerId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`trialEndsAt` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_subscriptions_providerId_unique` UNIQUE(`providerId`)
);
--> statement-breakpoint
ALTER TABLE `provider_subscriptions` ADD CONSTRAINT `provider_subscriptions_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `provider_sub_idx` ON `provider_subscriptions` (`providerId`);--> statement-breakpoint
CREATE INDEX `tier_status_idx` ON `provider_subscriptions` (`tier`,`status`);