CREATE TABLE `promo_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` decimal(10,2) NOT NULL,
	`minOrderAmount` decimal(10,2),
	`maxDiscountAmount` decimal(10,2),
	`maxRedemptions` int,
	`currentRedemptions` int NOT NULL DEFAULT 0,
	`maxRedemptionsPerUser` int NOT NULL DEFAULT 1,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`appliesToAllServices` boolean NOT NULL DEFAULT true,
	`serviceIds` text,
	`codeType` enum('promo','referral') NOT NULL DEFAULT 'promo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promo_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promoCodeId` int NOT NULL,
	`userId` int NOT NULL,
	`bookingId` int,
	`discountAmount` decimal(10,2) NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promo_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `promo_provider_idx` ON `promo_codes` (`providerId`);--> statement-breakpoint
CREATE INDEX `promo_code_idx` ON `promo_codes` (`code`);--> statement-breakpoint
CREATE INDEX `redemption_promo_idx` ON `promo_redemptions` (`promoCodeId`);--> statement-breakpoint
CREATE INDEX `redemption_user_idx` ON `promo_redemptions` (`userId`);--> statement-breakpoint
CREATE INDEX `redemption_booking_idx` ON `promo_redemptions` (`bookingId`);