-- Taxonomy moves to code-managed constants (packages/shared/src/taxonomy).
-- Run `npm run db:seed` after this migration: it syncs the new categories, services and global facets.

-- 1. Price units: add WEEK and MONTH; SHIFT is retired and becomes DAY.
--    Widen first so existing SHIFT rows stay valid, convert, then narrow.
ALTER TABLE `ProfessionalService` MODIFY `priceUnit` ENUM('HOUR', 'DAY', 'SHIFT', 'WEEK', 'MONTH', 'VISIT') NOT NULL;
ALTER TABLE `CareRequest` MODIFY `priceUnit` ENUM('HOUR', 'DAY', 'SHIFT', 'WEEK', 'MONTH', 'VISIT') NULL;
UPDATE `ProfessionalService` SET `priceUnit` = 'DAY' WHERE `priceUnit` = 'SHIFT';
UPDATE `CareRequest` SET `priceUnit` = 'DAY' WHERE `priceUnit` = 'SHIFT';
ALTER TABLE `ProfessionalService` MODIFY `priceUnit` ENUM('HOUR', 'DAY', 'WEEK', 'MONTH', 'VISIT') NOT NULL;
ALTER TABLE `CareRequest` MODIFY `priceUnit` ENUM('HOUR', 'DAY', 'WEEK', 'MONTH', 'VISIT') NULL;

-- 2. Facets become global (work schedule / work place). The old category-specific facets
--    (age groups, tasks, animal types…) are replaced by services, so their rows are removed.
DELETE FROM `ProfessionalAttribute`;
DELETE FROM `AttributeTranslation`;
DELETE FROM `CareAttribute`;

ALTER TABLE `CareAttribute` DROP FOREIGN KEY `CareAttribute_categoryId_fkey`;
DROP INDEX `CareAttribute_categoryId_group_idx` ON `CareAttribute`;
ALTER TABLE `CareAttribute` DROP COLUMN `categoryId`,
    MODIFY `group` ENUM('WORK_SCHEDULE', 'WORK_PLACE') NOT NULL;
CREATE INDEX `CareAttribute_group_idx` ON `CareAttribute`(`group`);

-- 3. Profile fields for the age, education and start-date filters.
ALTER TABLE `ProfessionalProfile` ADD COLUMN `availableFrom` DATE NULL,
    ADD COLUMN `birthYear` SMALLINT NULL,
    ADD COLUMN `educationLevel` ENUM('SECONDARY', 'VOCATIONAL', 'BACHELOR', 'MASTER') NULL;
CREATE INDEX `ProfessionalProfile_status_birthYear_idx` ON `ProfessionalProfile`(`status`, `birthYear`);
