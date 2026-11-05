-- Admin-brokered care requests (leads). Professionals never see these rows.
-- CreateTable
CREATE TABLE `CareLead` (
    `id` VARCHAR(30) NOT NULL,
    `status` ENUM('NEW', 'IN_PROGRESS', 'MATCHED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `source` ENUM('PROFILE', 'GENERAL') NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `userId` VARCHAR(30) NULL,
    `requestedProfessionalId` VARCHAR(30) NULL,
    `professionalId` VARCHAR(30) NULL,
    `categoryId` VARCHAR(30) NULL,
    `serviceId` VARCHAR(30) NULL,
    `locationId` VARCHAR(30) NULL,
    `schedule` VARCHAR(300) NOT NULL DEFAULT '',
    `message` TEXT NOT NULL DEFAULT '',
    `locale` ENUM('hy', 'ru', 'en') NOT NULL DEFAULT 'hy',
    `adminNote` TEXT NULL,
    `handledById` VARCHAR(30) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CareLead_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `CareLead_professionalId_idx`(`professionalId`),
    INDEX `CareLead_requestedProfessionalId_idx`(`requestedProfessionalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_requestedProfessionalId_fkey` FOREIGN KEY (`requestedProfessionalId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareLead` ADD CONSTRAINT `CareLead_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

