-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL DEFAULT 'hy',
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `suspendedAt` DATETIME(3) NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(30) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(30) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    INDEX `PasswordResetToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryTranslation` (
    `id` VARCHAR(30) NOT NULL,
    `categoryId` VARCHAR(30) NOT NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(1000) NOT NULL DEFAULT '',

    UNIQUE INDEX `CategoryTranslation_categoryId_locale_key`(`categoryId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `categoryId` VARCHAR(30) NOT NULL,
    `requiredQualification` ENUM('IDENTITY', 'NURSING_LICENSE', 'MEDICAL_EDUCATION', 'FIRST_AID', 'PEDAGOGY', 'VETERINARY', 'OTHER') NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Service_slug_key`(`slug`),
    INDEX `Service_categoryId_active_idx`(`categoryId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceTranslation` (
    `id` VARCHAR(30) NOT NULL,
    `serviceId` VARCHAR(30) NOT NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(1000) NOT NULL DEFAULT '',

    UNIQUE INDEX `ServiceTranslation_serviceId_locale_key`(`serviceId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CareAttribute` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `categoryId` VARCHAR(30) NOT NULL,
    `group` ENUM('AGE_GROUP', 'CARE_FORMAT', 'TASK', 'SETTING', 'ANIMAL_TYPE', 'ANIMAL_SIZE') NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `CareAttribute_slug_key`(`slug`),
    INDEX `CareAttribute_categoryId_group_idx`(`categoryId`, `group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeTranslation` (
    `id` VARCHAR(30) NOT NULL,
    `attributeId` VARCHAR(30) NOT NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(1000) NOT NULL DEFAULT '',

    UNIQUE INDEX `AttributeTranslation_attributeId_locale_key`(`attributeId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `type` ENUM('REGION', 'CITY', 'DISTRICT') NOT NULL,
    `parentId` VARCHAR(30) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Location_slug_key`(`slug`),
    INDEX `Location_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationTranslation` (
    `id` VARCHAR(30) NOT NULL,
    `locationId` VARCHAR(30) NOT NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(1000) NOT NULL DEFAULT '',

    UNIQUE INDEX `LocationTranslation_locationId_locale_key`(`locationId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfessionalProfile` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
    `displayName` VARCHAR(80) NOT NULL DEFAULT '',
    `originalLocale` ENUM('hy', 'ru', 'en') NOT NULL DEFAULT 'hy',
    `categoryId` VARCHAR(30) NULL,
    `homeLocationId` VARCHAR(30) NULL,
    `experienceYears` INTEGER NOT NULL DEFAULT 0,
    `experienceSummary` VARCHAR(1000) NOT NULL DEFAULT '',
    `portraitMediaId` VARCHAR(30) NULL,
    `onboardingStep` INTEGER NOT NULL DEFAULT 0,
    `rejectionReason` VARCHAR(1000) NULL,
    `adminNote` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `suspendedAt` DATETIME(3) NULL,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `ratingSum` INTEGER NOT NULL DEFAULT 0,
    `minHourlyPrice` INTEGER NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProfessionalProfile_userId_key`(`userId`),
    UNIQUE INDEX `ProfessionalProfile_slug_key`(`slug`),
    UNIQUE INDEX `ProfessionalProfile_portraitMediaId_key`(`portraitMediaId`),
    INDEX `ProfessionalProfile_status_categoryId_idx`(`status`, `categoryId`),
    INDEX `ProfessionalProfile_status_experienceYears_idx`(`status`, `experienceYears`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfessionalTranslation` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL,
    `headline` VARCHAR(120) NOT NULL,
    `bio` TEXT NOT NULL,

    UNIQUE INDEX `ProfessionalTranslation_profileId_locale_key`(`profileId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfessionalLanguage` (
    `profileId` VARCHAR(30) NOT NULL,
    `code` VARCHAR(5) NOT NULL,

    INDEX `ProfessionalLanguage_code_idx`(`code`),
    PRIMARY KEY (`profileId`, `code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfessionalService` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `serviceId` VARCHAR(30) NOT NULL,
    `priceKind` ENUM('FIXED', 'NEGOTIABLE') NOT NULL DEFAULT 'FIXED',
    `priceAmount` INTEGER NULL,
    `priceUnit` ENUM('HOUR', 'DAY', 'SHIFT', 'VISIT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfessionalService_serviceId_priceUnit_priceAmount_idx`(`serviceId`, `priceUnit`, `priceAmount`),
    UNIQUE INDEX `ProfessionalService_profileId_serviceId_key`(`profileId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfessionalAttribute` (
    `profileId` VARCHAR(30) NOT NULL,
    `attributeId` VARCHAR(30) NOT NULL,

    INDEX `ProfessionalAttribute_attributeId_idx`(`attributeId`),
    PRIMARY KEY (`profileId`, `attributeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceArea` (
    `profileId` VARCHAR(30) NOT NULL,
    `locationId` VARCHAR(30) NOT NULL,

    INDEX `ServiceArea_locationId_idx`(`locationId`),
    PRIMARY KEY (`profileId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Qualification` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `kind` ENUM('IDENTITY', 'NURSING_LICENSE', 'MEDICAL_EDUCATION', 'FIRST_AID', 'PEDAGOGY', 'VETERINARY', 'OTHER') NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `issuer` VARCHAR(160) NOT NULL DEFAULT '',
    `issuedYear` INTEGER NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `internalNote` TEXT NULL,
    `rejectionReason` VARCHAR(1000) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` VARCHAR(30) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Qualification_profileId_status_idx`(`profileId`, `status`),
    INDEX `Qualification_kind_status_idx`(`kind`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrivateDocument` (
    `id` VARCHAR(30) NOT NULL,
    `ownerId` VARCHAR(30) NOT NULL,
    `qualificationId` VARCHAR(30) NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PrivateDocument_storageKey_key`(`storageKey`),
    INDEX `PrivateDocument_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(30) NOT NULL,
    `ownerId` VARCHAR(30) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MediaAsset_storageKey_key`(`storageKey`),
    INDEX `MediaAsset_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AvailabilityRule` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `weekday` TINYINT NOT NULL,
    `startMinute` SMALLINT NOT NULL,
    `endMinute` SMALLINT NOT NULL,

    INDEX `AvailabilityRule_profileId_weekday_idx`(`profileId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AvailabilityException` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `date` DATE NOT NULL,
    `available` BOOLEAN NOT NULL DEFAULT false,
    `startMinute` SMALLINT NULL,
    `endMinute` SMALLINT NULL,
    `note` VARCHAR(200) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AvailabilityException_profileId_date_idx`(`profileId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CareRequest` (
    `id` VARCHAR(30) NOT NULL,
    `customerId` VARCHAR(30) NOT NULL,
    `professionalId` VARCHAR(30) NOT NULL,
    `serviceId` VARCHAR(30) NOT NULL,
    `locationId` VARCHAR(30) NOT NULL,
    `status` ENUM('SUBMITTED', 'ACCEPTED', 'DECLINED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'SUBMITTED',
    `scheduleType` ENUM('ONE_TIME', 'RECURRING') NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `weekdayMask` TINYINT NULL,
    `startDate` CHAR(10) NULL,
    `endDate` CHAR(10) NULL,
    `startMinute` SMALLINT NOT NULL,
    `endMinute` SMALLINT NOT NULL,
    `addressNote` VARCHAR(300) NOT NULL DEFAULT '',
    `requirements` TEXT NOT NULL DEFAULT '',
    `priceKind` ENUM('FIXED', 'NEGOTIABLE') NULL,
    `priceAmount` INTEGER NULL,
    `priceUnit` ENUM('HOUR', 'DAY', 'SHIFT', 'VISIT') NULL,
    `acceptedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(500) NULL,
    `declineReason` VARCHAR(500) NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CareRequest_customerId_status_idx`(`customerId`, `status`),
    INDEX `CareRequest_professionalId_status_idx`(`professionalId`, `status`),
    INDEX `CareRequest_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `CareRequest_professionalId_startAt_endAt_idx`(`professionalId`, `startAt`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingOccurrence` (
    `id` VARCHAR(30) NOT NULL,
    `requestId` VARCHAR(30) NOT NULL,
    `professionalId` VARCHAR(30) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',

    INDEX `BookingOccurrence_professionalId_status_startAt_endAt_idx`(`professionalId`, `status`, `startAt`, `endAt`),
    INDEX `BookingOccurrence_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestEvent` (
    `id` VARCHAR(30) NOT NULL,
    `requestId` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NULL,
    `actorRole` ENUM('CUSTOMER', 'PROFESSIONAL', 'SYSTEM', 'ADMIN') NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `fromStatus` ENUM('SUBMITTED', 'ACCEPTED', 'DECLINED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED') NULL,
    `toStatus` ENUM('SUBMITTED', 'ACCEPTED', 'DECLINED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED') NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RequestEvent_requestId_createdAt_idx`(`requestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestNote` (
    `id` VARCHAR(30) NOT NULL,
    `requestId` VARCHAR(30) NOT NULL,
    `authorId` VARCHAR(30) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RequestNote_requestId_createdAt_idx`(`requestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `userId` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Favorite_profileId_idx`(`profileId`),
    PRIMARY KEY (`userId`, `profileId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(30) NOT NULL,
    `requestId` VARCHAR(30) NOT NULL,
    `customerId` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `rating` TINYINT NOT NULL,
    `body` TEXT NOT NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL,
    `status` ENUM('PENDING', 'PUBLISHED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `moderatedAt` DATETIME(3) NULL,
    `moderatedBy` VARCHAR(30) NULL,
    `moderationNote` VARCHAR(1000) NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_requestId_key`(`requestId`),
    INDEX `Review_profileId_status_createdAt_idx`(`profileId`, `status`, `createdAt`),
    INDEX `Review_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `params` JSON NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportInquiry` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NULL,
    `name` VARCHAR(80) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `topic` ENUM('GENERAL', 'ACCOUNT', 'REQUEST_ISSUE', 'PROFESSIONAL', 'SAFETY', 'OTHER') NOT NULL,
    `message` TEXT NOT NULL,
    `requestId` VARCHAR(30) NULL,
    `locale` ENUM('hy', 'ru', 'en') NOT NULL DEFAULT 'hy',
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `adminNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportInquiry_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NULL,
    `action` VARCHAR(60) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(40) NOT NULL,
    `meta` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DevMail` (
    `id` VARCHAR(30) NOT NULL,
    `to` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryTranslation` ADD CONSTRAINT `CategoryTranslation_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTranslation` ADD CONSTRAINT `ServiceTranslation_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareAttribute` ADD CONSTRAINT `CareAttribute_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeTranslation` ADD CONSTRAINT `AttributeTranslation_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `CareAttribute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationTranslation` ADD CONSTRAINT `LocationTranslation_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalProfile` ADD CONSTRAINT `ProfessionalProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalProfile` ADD CONSTRAINT `ProfessionalProfile_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalProfile` ADD CONSTRAINT `ProfessionalProfile_homeLocationId_fkey` FOREIGN KEY (`homeLocationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalProfile` ADD CONSTRAINT `ProfessionalProfile_portraitMediaId_fkey` FOREIGN KEY (`portraitMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalTranslation` ADD CONSTRAINT `ProfessionalTranslation_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalLanguage` ADD CONSTRAINT `ProfessionalLanguage_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalService` ADD CONSTRAINT `ProfessionalService_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalService` ADD CONSTRAINT `ProfessionalService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalAttribute` ADD CONSTRAINT `ProfessionalAttribute_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalAttribute` ADD CONSTRAINT `ProfessionalAttribute_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `CareAttribute`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceArea` ADD CONSTRAINT `ServiceArea_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceArea` ADD CONSTRAINT `ServiceArea_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Qualification` ADD CONSTRAINT `Qualification_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrivateDocument` ADD CONSTRAINT `PrivateDocument_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrivateDocument` ADD CONSTRAINT `PrivateDocument_qualificationId_fkey` FOREIGN KEY (`qualificationId`) REFERENCES `Qualification`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityRule` ADD CONSTRAINT `AvailabilityRule_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityException` ADD CONSTRAINT `AvailabilityException_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRequest` ADD CONSTRAINT `CareRequest_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRequest` ADD CONSTRAINT `CareRequest_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRequest` ADD CONSTRAINT `CareRequest_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRequest` ADD CONSTRAINT `CareRequest_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingOccurrence` ADD CONSTRAINT `BookingOccurrence_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `CareRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingOccurrence` ADD CONSTRAINT `BookingOccurrence_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestEvent` ADD CONSTRAINT `RequestEvent_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `CareRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestEvent` ADD CONSTRAINT `RequestEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestNote` ADD CONSTRAINT `RequestNote_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `CareRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestNote` ADD CONSTRAINT `RequestNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `CareRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ProfessionalProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportInquiry` ADD CONSTRAINT `SupportInquiry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
