ALTER TABLE `service_providers` ADD `tippingEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `service_providers` ADD `tipZelleHandle` varchar(255);--> statement-breakpoint
ALTER TABLE `service_providers` ADD `tipCashAppHandle` varchar(255);--> statement-breakpoint
ALTER TABLE `service_providers` ADD `tipVenmoHandle` varchar(255);