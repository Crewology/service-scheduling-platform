CREATE TABLE `invoice_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`quantity` decimal(10,2) NOT NULL DEFAULT '1',
	`unitPrice` int NOT NULL,
	`amount` int NOT NULL,
	`serviceId` int,
	CONSTRAINT `invoice_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(30) NOT NULL,
	`invoiceType` enum('invoice','receipt','credit_note') NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`bookingId` int,
	`promotionId` int,
	`paymentId` int,
	`invoiceStatus` enum('draft','sent','viewed','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
	`subtotal` int NOT NULL DEFAULT 0,
	`taxRate` decimal(5,2) DEFAULT '0',
	`taxAmount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp,
	`paidAt` timestamp,
	`stripePaymentIntentId` varchar(255),
	`stripeCheckoutSessionId` varchar(255),
	`pdfUrl` varchar(500),
	`notes` text,
	`customerEmail` varchar(320),
	`originalInvoiceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE INDEX `line_item_invoice_idx` ON `invoice_line_items` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `invoice_provider_idx` ON `invoices` (`providerId`);--> statement-breakpoint
CREATE INDEX `invoice_customer_idx` ON `invoices` (`customerId`);--> statement-breakpoint
CREATE INDEX `invoice_status_idx` ON `invoices` (`invoiceStatus`);--> statement-breakpoint
CREATE INDEX `invoice_number_idx` ON `invoices` (`invoiceNumber`);