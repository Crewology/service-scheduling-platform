CREATE TABLE `customer_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` enum('free','pro','business') NOT NULL DEFAULT 'free',
	`status` enum('active','trialing','past_due','cancelled','incomplete') NOT NULL DEFAULT 'active',
	`stripeSubscriptionId` varchar(255),
	`stripeCustomerId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`trialEndsAt` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD CONSTRAINT `customer_subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cust_sub_user_idx` ON `customer_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `cust_sub_tier_status_idx` ON `customer_subscriptions` (`tier`,`status`);