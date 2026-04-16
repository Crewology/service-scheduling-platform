CREATE TABLE `referral_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`type` enum('earned','spent','expired') NOT NULL,
	`referralId` int,
	`bookingId` int,
	`description` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `referral_credits` ADD CONSTRAINT `referral_credits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_credits` ADD CONSTRAINT `referral_credits_referralId_referrals_id_fk` FOREIGN KEY (`referralId`) REFERENCES `referrals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `referral_credit_user_idx` ON `referral_credits` (`userId`);--> statement-breakpoint
CREATE INDEX `referral_credit_type_idx` ON `referral_credits` (`type`);