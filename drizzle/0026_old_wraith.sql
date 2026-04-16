CREATE TABLE `provider_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referralCode` varchar(20) NOT NULL,
	`referredUserId` int,
	`referredProviderId` int,
	`status` enum('pending','signed_up','onboarded','credited') NOT NULL DEFAULT 'pending',
	`creditAmount` decimal(10,2) DEFAULT '10.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`convertedAt` timestamp,
	`creditedAt` timestamp,
	CONSTRAINT `provider_referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_referrals_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `referral_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`referralId` int,
	`type` enum('earned','redeemed','expired','bonus') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` text,
	`balanceAfter` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `provider_referrals` ADD CONSTRAINT `provider_referrals_referrerId_service_providers_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_referrals` ADD CONSTRAINT `provider_referrals_referredUserId_users_id_fk` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_referrals` ADD CONSTRAINT `provider_referrals_referredProviderId_service_providers_id_fk` FOREIGN KEY (`referredProviderId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_credits` ADD CONSTRAINT `referral_credits_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_credits` ADD CONSTRAINT `referral_credits_referralId_provider_referrals_id_fk` FOREIGN KEY (`referralId`) REFERENCES `provider_referrals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `referral_referrer_idx` ON `provider_referrals` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_code_idx` ON `provider_referrals` (`referralCode`);--> statement-breakpoint
CREATE INDEX `referral_referred_user_idx` ON `provider_referrals` (`referredUserId`);--> statement-breakpoint
CREATE INDEX `credit_provider_idx` ON `referral_credits` (`providerId`);--> statement-breakpoint
CREATE INDEX `credit_type_idx` ON `referral_credits` (`type`);