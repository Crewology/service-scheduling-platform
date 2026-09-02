ALTER TABLE `verification_documents`
  MODIFY COLUMN `documentType` enum('identity','business_license','professional_license','insurance','background_check') NOT NULL;
--> statement-breakpoint
ALTER TABLE `verification_documents`
  MODIFY COLUMN `verificationStatus` enum('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `verification_documents`
  ADD `documentKey` varchar(500),
  ADD `documentLabel` varchar(255),
  ADD `issuer` varchar(255),
  ADD `credentialIdentifier` varchar(255),
  ADD `jurisdiction` varchar(100),
  ADD `issuedDate` varchar(10),
  ADD `revokedBy` int,
  ADD `revokedAt` timestamp,
  ADD `revocationReason` text;
--> statement-breakpoint
CREATE INDEX `provider_type_created_idx` ON `verification_documents` (`providerId`,`documentType`,`createdAt`);
