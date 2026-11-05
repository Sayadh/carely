-- Weighted rating over the last 50 published reviews (see apps/api/src/reviews/rating.ts).
ALTER TABLE `ProfessionalProfile`
  ADD COLUMN `ratingValue` DOUBLE NULL,
  ADD COLUMN `totalReviewCount` INTEGER NOT NULL DEFAULT 0,
  DROP COLUMN `ratingSum`;

-- Stored values are rebuilt by the application (jobs run self-heals profiles whose totals are out of date).
UPDATE `ProfessionalProfile` SET `ratingCount` = 0, `ratingValue` = NULL, `totalReviewCount` = 0;

-- Scores are whole numbers 1..5 (enforced by MariaDB ≥10.2 / MySQL ≥8.0.16; API validation covers older servers).
ALTER TABLE `Review` ADD CONSTRAINT `Review_rating_range` CHECK (`rating` BETWEEN 1 AND 5);
