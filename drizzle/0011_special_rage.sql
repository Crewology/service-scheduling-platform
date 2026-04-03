CREATE TABLE `referral_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`referrerDiscountPercent` int NOT NULL DEFAULT 10,
	`refereeDiscountPercent` int NOT NULL DEFAULT 10,
	`maxReferrals` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referralCodeId` int NOT NULL,
	`referrerId` int NOT NULL,
	`refereeId` int NOT NULL,
	`refereeBookingId` int,
	`referrerRewardBookingId` int,
	`referrerDiscountAmount` decimal(10,2),
	`refereeDiscountAmount` decimal(10,2),
	`status` enum('pending','completed','expired') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `referral_codes` ADD CONSTRAINT `referral_codes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referralCodeId_referral_codes_id_fk` FOREIGN KEY (`referralCodeId`) REFERENCES `referral_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_refereeId_users_id_fk` FOREIGN KEY (`refereeId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `referral_user_idx` ON `referral_codes` (`userId`);--> statement-breakpoint
CREATE INDEX `referral_code_idx` ON `referral_codes` (`code`);--> statement-breakpoint
CREATE INDEX `referral_referrer_idx` ON `referrals` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_referee_idx` ON `referrals` (`refereeId`);--> statement-breakpoint
CREATE INDEX `referral_code_ref_idx` ON `referrals` (`referralCodeId`);