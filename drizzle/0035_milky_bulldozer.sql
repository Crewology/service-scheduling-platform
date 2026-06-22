CREATE TABLE `partner_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeTransferId` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`sourceType` enum('provider_subscription','customer_subscription','booking_platform_fee') NOT NULL,
	`sourceId` varchar(255),
	`sourceDescription` text,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`partnerAccountId` varchar(255) NOT NULL,
	`splitPercentage` decimal(5,2) NOT NULL DEFAULT '40.00',
	`totalRevenue` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `partner_transfer_source_idx` ON `partner_transfers` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `partner_transfer_status_idx` ON `partner_transfers` (`status`);--> statement-breakpoint
CREATE INDEX `partner_transfer_created_idx` ON `partner_transfers` (`createdAt`);