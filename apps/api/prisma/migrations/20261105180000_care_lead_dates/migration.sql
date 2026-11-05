-- Optional requested period for team requests.
ALTER TABLE `CareLead` ADD COLUMN `startDate` DATE NULL,
    ADD COLUMN `endDate` DATE NULL;
