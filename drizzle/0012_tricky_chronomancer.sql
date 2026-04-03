CREATE TABLE `provider_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`categoryId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_category_unique` UNIQUE(`providerId`,`categoryId`)
);
--> statement-breakpoint
ALTER TABLE `provider_categories` ADD CONSTRAINT `provider_categories_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_categories` ADD CONSTRAINT `provider_categories_categoryId_service_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `provider_category_idx` ON `provider_categories` (`providerId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `category_provider_idx` ON `provider_categories` (`categoryId`,`providerId`);