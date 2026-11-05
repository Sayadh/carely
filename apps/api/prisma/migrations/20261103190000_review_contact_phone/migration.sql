-- Admin-only follow-up phone for reviews (required by API validation; nullable for existing rows).
ALTER TABLE `Review` ADD COLUMN `contactPhone` VARCHAR(20) NULL;
