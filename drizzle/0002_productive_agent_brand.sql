ALTER TABLE `availability_overrides` MODIFY COLUMN `overrideDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `bookingDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `verification_documents` MODIFY COLUMN `expirationDate` varchar(10);