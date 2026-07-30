ALTER TABLE `invoices` MODIFY COLUMN `customerId` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `invoices` ADD `customerName` varchar(255);