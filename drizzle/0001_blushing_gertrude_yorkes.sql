CREATE TABLE `availability_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`overrideDate` date NOT NULL,
	`startTime` time,
	`endTime` time,
	`isAvailable` boolean NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `availability_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` time NOT NULL,
	`endTime` time NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`locationType` enum('mobile','fixed_location','virtual'),
	`maxConcurrentBookings` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `availability_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingNumber` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`providerId` int NOT NULL,
	`serviceId` int NOT NULL,
	`bookingDate` date NOT NULL,
	`startTime` time NOT NULL,
	`endTime` time NOT NULL,
	`durationMinutes` int NOT NULL,
	`status` enum('pending','confirmed','in_progress','completed','cancelled','no_show','refunded') NOT NULL,
	`locationType` enum('mobile','fixed_location','virtual') NOT NULL,
	`serviceAddressLine1` varchar(255),
	`serviceAddressLine2` varchar(255),
	`serviceCity` varchar(100),
	`serviceState` varchar(50),
	`servicePostalCode` varchar(20),
	`customerNotes` text,
	`providerNotes` text,
	`subtotal` decimal(10,2) NOT NULL,
	`travelFee` decimal(10,2) DEFAULT '0.00',
	`platformFee` decimal(10,2) NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`depositAmount` decimal(10,2) DEFAULT '0.00',
	`remainingAmount` decimal(10,2) NOT NULL,
	`cancellationReason` text,
	`cancelledBy` enum('customer','provider','admin'),
	`cancelledAt` timestamp,
	`confirmedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_bookingNumber_unique` UNIQUE(`bookingNumber`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` varchar(100) NOT NULL,
	`bookingId` int,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`messageText` text NOT NULL,
	`attachmentUrl` varchar(500),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`actionUrl` varchar(500),
	`relatedBookingId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`isSentEmail` boolean NOT NULL DEFAULT false,
	`isSentSms` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`paymentType` enum('deposit','final','full','refund') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`status` enum('pending','authorized','captured','failed','refunded','cancelled') NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`stripeChargeId` varchar(255),
	`stripeRefundId` varchar(255),
	`paymentMethod` varchar(50),
	`failureReason` text,
	`refundAmount` decimal(10,2) DEFAULT '0.00',
	`refundReason` text,
	`processedAt` timestamp,
	`refundedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`customerId` int NOT NULL,
	`providerId` int NOT NULL,
	`rating` int NOT NULL,
	`reviewText` text,
	`responseText` text,
	`respondedAt` timestamp,
	`isVerifiedBooking` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isFlagged` boolean NOT NULL DEFAULT false,
	`flaggedReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_bookingId_unique` UNIQUE(`bookingId`)
);
--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`iconUrl` varchar(500),
	`isMobileEnabled` boolean NOT NULL DEFAULT true,
	`isFixedLocationEnabled` boolean NOT NULL DEFAULT true,
	`isVirtualEnabled` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `service_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `service_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceId` int NOT NULL,
	`photoUrl` varchar(500) NOT NULL,
	`caption` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`businessType` enum('sole_proprietor','llc','corporation','partnership') NOT NULL,
	`description` text,
	`yearsInBusiness` int,
	`licenseNumber` varchar(100),
	`insuranceVerified` boolean NOT NULL DEFAULT false,
	`backgroundCheckVerified` boolean NOT NULL DEFAULT false,
	`addressLine1` varchar(255),
	`addressLine2` varchar(255),
	`city` varchar(100),
	`state` varchar(50),
	`postalCode` varchar(20),
	`country` varchar(50) DEFAULT 'USA',
	`serviceRadiusMiles` int,
	`acceptsMobile` boolean NOT NULL DEFAULT false,
	`acceptsFixedLocation` boolean NOT NULL DEFAULT true,
	`acceptsVirtual` boolean NOT NULL DEFAULT false,
	`averageRating` decimal(3,2) DEFAULT '0.00',
	`totalReviews` int NOT NULL DEFAULT 0,
	`totalBookings` int NOT NULL DEFAULT 0,
	`stripeAccountId` varchar(255),
	`payoutEnabled` boolean NOT NULL DEFAULT false,
	`commissionRate` decimal(5,2) DEFAULT '15.00',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `service_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_providers_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`serviceType` enum('mobile','fixed_location','virtual','hybrid') NOT NULL,
	`pricingModel` enum('fixed','hourly','package','custom_quote') NOT NULL,
	`basePrice` decimal(10,2),
	`hourlyRate` decimal(10,2),
	`durationMinutes` int,
	`depositRequired` boolean NOT NULL DEFAULT false,
	`depositType` enum('fixed','percentage'),
	`depositAmount` decimal(10,2),
	`depositPercentage` decimal(5,2),
	`preparationTimeMinutes` int NOT NULL DEFAULT 0,
	`cleanupTimeMinutes` int NOT NULL DEFAULT 0,
	`bufferTimeMinutes` int NOT NULL DEFAULT 15,
	`maxAdvanceBookingDays` int NOT NULL DEFAULT 90,
	`minAdvanceBookingHours` int NOT NULL DEFAULT 24,
	`cancellationPolicy` text,
	`specialRequirements` text,
	`equipmentNeeded` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`documentType` enum('identity','business_license','insurance','background_check') NOT NULL,
	`documentUrl` varchar(500) NOT NULL,
	`verificationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`rejectionReason` text,
	`expirationDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','provider','admin') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `firstName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `lastName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhotoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `availability_overrides` ADD CONSTRAINT `availability_overrides_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `availability_schedules` ADD CONSTRAINT `availability_schedules_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_relatedBookingId_bookings_id_fk` FOREIGN KEY (`relatedBookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_photos` ADD CONSTRAINT `service_photos_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_providers` ADD CONSTRAINT `service_providers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_categoryId_service_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `provider_date_idx` ON `availability_overrides` (`providerId`,`overrideDate`);--> statement-breakpoint
CREATE INDEX `provider_day_idx` ON `availability_schedules` (`providerId`,`dayOfWeek`);--> statement-breakpoint
CREATE INDEX `customer_status_idx` ON `bookings` (`customerId`,`status`);--> statement-breakpoint
CREATE INDEX `provider_date_idx` ON `bookings` (`providerId`,`bookingDate`);--> statement-breakpoint
CREATE INDEX `status_date_idx` ON `bookings` (`status`,`bookingDate`);--> statement-breakpoint
CREATE INDEX `conversation_idx` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recipient_read_idx` ON `messages` (`recipientId`,`isRead`);--> statement-breakpoint
CREATE INDEX `user_read_idx` ON `notifications` (`userId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `booking_type_idx` ON `payments` (`bookingId`,`paymentType`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `provider_rating_idx` ON `reviews` (`providerId`,`rating`);--> statement-breakpoint
CREATE INDEX `featured_idx` ON `reviews` (`isFeatured`);--> statement-breakpoint
CREATE INDEX `active_order_idx` ON `service_categories` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `service_order_idx` ON `service_photos` (`serviceId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `service_providers` (`userId`);--> statement-breakpoint
CREATE INDEX `city_state_idx` ON `service_providers` (`city`,`state`);--> statement-breakpoint
CREATE INDEX `rating_idx` ON `service_providers` (`averageRating`);--> statement-breakpoint
CREATE INDEX `featured_active_idx` ON `service_providers` (`isFeatured`,`isActive`);--> statement-breakpoint
CREATE INDEX `provider_active_idx` ON `services` (`providerId`,`isActive`);--> statement-breakpoint
CREATE INDEX `category_active_idx` ON `services` (`categoryId`,`isActive`);--> statement-breakpoint
CREATE INDEX `provider_type_idx` ON `verification_documents` (`providerId`,`documentType`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `verification_documents` (`verificationStatus`);