CREATE TABLE `crm_activity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(191) NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`eventType` enum('quote.requested','quote.sent','quote.accepted','quote.declined','quote.expired','quote.booked','booking.created','booking.confirmed','booking.started','booking.completed','booking.cancelled','booking.no_show','booking.refunded','payment.captured','payment.failed','refund.confirmed','invoice.created','invoice.sent','invoice.viewed','invoice.paid','invoice.overdue','invoice.cancelled','message.sent','message.read','review.received','review.response_added','contact.stage_changed','task.created','task.completed','task.dismissed','draft.created','draft.sent') NOT NULL,
	`entityType` enum('quote','booking','payment','invoice','message','review','contact','task','draft') NOT NULL,
	`entityId` int NOT NULL,
	`summary` varchar(255) NOT NULL,
	`metadata` json NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`projectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_activity_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_event_key_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE TABLE `crm_automation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int,
	`scopeKey` varchar(64) NOT NULL,
	`ruleKey` enum('quote_follow_up','quote_expiring','booking_confirmation','overdue_invoice','rebooking_opportunity','archived_relationship_review') NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`actionType` enum('create_task','create_draft') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`inactivityDays` int,
	`configuration` json,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_automation_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_rule_scope_key_version_unique` UNIQUE(`scopeKey`,`ruleKey`,`version`)
);
--> statement-breakpoint
CREATE TABLE `crm_automation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`ruleId` int NOT NULL,
	`status` enum('succeeded','failed','skipped') NOT NULL,
	`dedupeKey` varchar(191) NOT NULL,
	`outputTaskId` int,
	`outputDraftId` int,
	`errorCode` varchar(100),
	`startedAt` timestamp NOT NULL,
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_automation_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_run_dedupe_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `crm_contact_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_contact_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_contact_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`relationshipMessagesAllowed` boolean,
	`doNotContact` boolean NOT NULL DEFAULT false,
	`reason` varchar(255),
	`source` enum('customer','provider','system') NOT NULL DEFAULT 'system',
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_contact_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_preference_contact_unique` UNIQUE(`contactId`)
);
--> statement-breakpoint
CREATE TABLE `crm_contact_stage_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`previousStage` enum('lead','quoted','booked','customer','repeat_customer','dormant','archived'),
	`nextStage` enum('lead','quoted','booked','customer','repeat_customer','dormant','archived') NOT NULL,
	`source` enum('system','provider','repair') NOT NULL,
	`reason` varchar(255) NOT NULL,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_contact_stage_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`derivedStage` enum('lead','quoted','booked','customer','repeat_customer','dormant') NOT NULL DEFAULT 'lead',
	`manualStage` enum('lead','quoted','booked','customer','repeat_customer','dormant','archived'),
	`archivedAt` timestamp,
	`archivedByUserId` int,
	`firstInteractionAt` timestamp NOT NULL,
	`lastInteractionAt` timestamp NOT NULL,
	`lastInboundAt` timestamp,
	`lastOutboundAt` timestamp,
	`nextBookingAt` timestamp,
	`completedBookingCount` int NOT NULL DEFAULT 0,
	`cancelledBookingCount` int NOT NULL DEFAULT 0,
	`noShowCount` int NOT NULL DEFAULT 0,
	`capturedValueCents` int NOT NULL DEFAULT 0,
	`openTaskCount` int NOT NULL DEFAULT 0,
	`lastProjectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_contact_provider_customer_unique` UNIQUE(`providerId`,`customerId`)
);
--> statement-breakpoint
CREATE TABLE `crm_message_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`ruleId` int,
	`taskId` int,
	`state` enum('draft','sent','discarded') NOT NULL DEFAULT 'draft',
	`body` text NOT NULL,
	`sentMessageId` int,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`discardedAt` timestamp,
	`dedupeKey` varchar(191),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_message_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_draft_dedupe_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `crm_operational_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_operational_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_operational_setting_key_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `crm_saved_segments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`filters` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_saved_segments_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_segment_provider_name_unique` UNIQUE(`providerId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`customerId` int NOT NULL,
	`contactId` int NOT NULL,
	`ruleId` int,
	`taskType` enum('respond_to_quote','quote_expiring','confirm_booking','overdue_invoice','rebooking_opportunity','relationship_review','manual_follow_up') NOT NULL,
	`state` enum('open','snoozed','completed','dismissed') NOT NULL DEFAULT 'open',
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueAt` timestamp,
	`snoozedUntil` timestamp,
	`completedAt` timestamp,
	`dismissedAt` timestamp,
	`dedupeKey` varchar(191),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_task_dedupe_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `relationshipMessageEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_activity_events` ADD CONSTRAINT `crm_activity_events_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activity_events` ADD CONSTRAINT `crm_activity_events_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activity_events` ADD CONSTRAINT `crm_activity_events_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_rules` ADD CONSTRAINT `crm_automation_rules_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_rules` ADD CONSTRAINT `crm_automation_rules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_runs` ADD CONSTRAINT `crm_automation_runs_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_runs` ADD CONSTRAINT `crm_automation_runs_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_runs` ADD CONSTRAINT `crm_automation_runs_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_runs` ADD CONSTRAINT `crm_automation_runs_ruleId_crm_automation_rules_id_fk` FOREIGN KEY (`ruleId`) REFERENCES `crm_automation_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_runs` ADD CONSTRAINT `crm_automation_runs_outputTaskId_crm_tasks_id_fk` FOREIGN KEY (`outputTaskId`) REFERENCES `crm_tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_automation_runs` ADD CONSTRAINT `crm_automation_runs_outputDraftId_crm_message_drafts_id_fk` FOREIGN KEY (`outputDraftId`) REFERENCES `crm_message_drafts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_notes` ADD CONSTRAINT `crm_contact_notes_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_notes` ADD CONSTRAINT `crm_contact_notes_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_notes` ADD CONSTRAINT `crm_contact_notes_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_notes` ADD CONSTRAINT `crm_contact_notes_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_preferences` ADD CONSTRAINT `crm_contact_preferences_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_preferences` ADD CONSTRAINT `crm_contact_preferences_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_preferences` ADD CONSTRAINT `crm_contact_preferences_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_preferences` ADD CONSTRAINT `crm_contact_preferences_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_stage_history` ADD CONSTRAINT `crm_contact_stage_history_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_stage_history` ADD CONSTRAINT `crm_contact_stage_history_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_stage_history` ADD CONSTRAINT `crm_contact_stage_history_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contact_stage_history` ADD CONSTRAINT `crm_contact_stage_history_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contacts` ADD CONSTRAINT `crm_contacts_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contacts` ADD CONSTRAINT `crm_contacts_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contacts` ADD CONSTRAINT `crm_contacts_archivedByUserId_users_id_fk` FOREIGN KEY (`archivedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_ruleId_crm_automation_rules_id_fk` FOREIGN KEY (`ruleId`) REFERENCES `crm_automation_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_taskId_crm_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `crm_tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_sentMessageId_messages_id_fk` FOREIGN KEY (`sentMessageId`) REFERENCES `messages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_message_drafts` ADD CONSTRAINT `crm_message_drafts_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_operational_state` ADD CONSTRAINT `crm_operational_state_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_saved_segments` ADD CONSTRAINT `crm_saved_segments_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_saved_segments` ADD CONSTRAINT `crm_saved_segments_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_contactId_crm_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `crm_contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_ruleId_crm_automation_rules_id_fk` FOREIGN KEY (`ruleId`) REFERENCES `crm_automation_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `crm_event_provider_contact_time_idx` ON `crm_activity_events` (`providerId`,`contactId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `crm_event_provider_type_time_idx` ON `crm_activity_events` (`providerId`,`eventType`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `crm_event_entity_idx` ON `crm_activity_events` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `crm_event_projection_idx` ON `crm_activity_events` (`projectedAt`,`id`);--> statement-breakpoint
CREATE INDEX `crm_rule_provider_enabled_idx` ON `crm_automation_rules` (`providerId`,`enabled`);--> statement-breakpoint
CREATE INDEX `crm_run_provider_status_idx` ON `crm_automation_runs` (`providerId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_run_rule_idx` ON `crm_automation_runs` (`ruleId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_note_provider_contact_idx` ON `crm_contact_notes` (`providerId`,`contactId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_note_author_idx` ON `crm_contact_notes` (`authorUserId`);--> statement-breakpoint
CREATE INDEX `crm_preference_provider_customer_idx` ON `crm_contact_preferences` (`providerId`,`customerId`);--> statement-breakpoint
CREATE INDEX `crm_stage_history_provider_contact_idx` ON `crm_contact_stage_history` (`providerId`,`contactId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_contact_provider_stage_idx` ON `crm_contacts` (`providerId`,`derivedStage`,`lastInteractionAt`);--> statement-breakpoint
CREATE INDEX `crm_contact_provider_manual_stage_idx` ON `crm_contacts` (`providerId`,`manualStage`,`lastInteractionAt`);--> statement-breakpoint
CREATE INDEX `crm_contact_provider_next_booking_idx` ON `crm_contacts` (`providerId`,`nextBookingAt`);--> statement-breakpoint
CREATE INDEX `crm_contact_customer_idx` ON `crm_contacts` (`customerId`);--> statement-breakpoint
CREATE INDEX `crm_draft_provider_state_idx` ON `crm_message_drafts` (`providerId`,`state`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_draft_provider_contact_idx` ON `crm_message_drafts` (`providerId`,`contactId`);--> statement-breakpoint
CREATE INDEX `crm_segment_provider_idx` ON `crm_saved_segments` (`providerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `crm_task_provider_state_due_idx` ON `crm_tasks` (`providerId`,`state`,`dueAt`);--> statement-breakpoint
CREATE INDEX `crm_task_provider_contact_idx` ON `crm_tasks` (`providerId`,`contactId`);