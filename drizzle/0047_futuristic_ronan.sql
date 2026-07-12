CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`serviceId` int,
	`tier` enum('quick_boost','category_spotlight','homepage_feature','smart_bundle') NOT NULL,
	`status` enum('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
	`headline` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`startDate` timestamp,
	`endDate` timestamp,
	`amountPaid` int NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`stripeSessionId` varchar(255),
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `promotion_provider_idx` ON `promotions` (`providerId`);--> statement-breakpoint
CREATE INDEX `promotion_status_idx` ON `promotions` (`status`);--> statement-breakpoint
CREATE INDEX `promotion_end_date_idx` ON `promotions` (`endDate`);