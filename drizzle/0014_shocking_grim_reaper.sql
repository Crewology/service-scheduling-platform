CREATE TABLE `customer_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `fav_user_provider_unique` UNIQUE(`userId`,`providerId`)
);
--> statement-breakpoint
CREATE TABLE `package_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packageId` int NOT NULL,
	`serviceId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `pkg_item_unique` UNIQUE(`packageId`,`serviceId`)
);
--> statement-breakpoint
CREATE TABLE `service_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`packagePrice` decimal(10,2) NOT NULL,
	`originalPrice` decimal(10,2) NOT NULL,
	`durationMinutes` int,
	`imageUrl` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customer_favorites` ADD CONSTRAINT `customer_favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_favorites` ADD CONSTRAINT `customer_favorites_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_items` ADD CONSTRAINT `package_items_packageId_service_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `service_packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_items` ADD CONSTRAINT `package_items_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_packages` ADD CONSTRAINT `service_packages_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fav_user_provider_idx` ON `customer_favorites` (`userId`,`providerId`);--> statement-breakpoint
CREATE INDEX `fav_provider_idx` ON `customer_favorites` (`providerId`);--> statement-breakpoint
CREATE INDEX `pkg_item_package_idx` ON `package_items` (`packageId`,`serviceId`);--> statement-breakpoint
CREATE INDEX `pkg_provider_active_idx` ON `service_packages` (`providerId`,`isActive`);