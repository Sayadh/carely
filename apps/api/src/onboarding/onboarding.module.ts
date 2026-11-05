import { Controller, Delete, Get, HttpCode, Injectable, Module, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  onboardingIntroSchema,
  onboardingServicesSchema,
  onboardingExperienceSchema,
  onboardingAreaSchema,
  onboardingLanguagesSchema,
  onboardingPricesSchema,
  onboardingScheduleSchema,
  qualificationInputSchema,
  availabilityExceptionSchema,
  facetAllowedFor,
  findFacet,
  type QualificationDto,
} from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodBody, Auth, AuthUser, CurrentUser, ZBody } from '../common/http';
import { NotificationsService } from '../notifications/notifications.module';
import { MediaModule } from '../media/media.module';
import { StorageService } from '../media/storage.service';
import { profileSlug } from './slug';

const STEP = { intro: 1, services: 2, experience: 3, area: 4, languages: 5, prices: 6, schedule: 7, documents: 8 } as const;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  private async own(userId: string) {
    const p = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!p) throw new AppError('NOT_FOUND');
    if (p.status === 'SUSPENDED') throw new AppError('PROFILE_NOT_EDITABLE');
    return p;
  }

  private async bumpStep(profileId: string, step: number) {
    await this.prisma.professionalProfile.updateMany({ where: { id: profileId, onboardingStep: { lt: step } }, data: { onboardingStep: step } });
  }

  /** A material change on a published profile sends it back to review (and hides it until approved again). */
  private async materialChange(profile: { id: string; status: string; userId: string }) {
    if (profile.status === 'APPROVED') {
      await this.prisma.professionalProfile.update({ where: { id: profile.id }, data: { status: 'PENDING', submittedAt: new Date(), approvedAt: null } });
      await this.notifications.notify(profile.userId, 'PROFILE_SUBMITTED', { reason: 'material_change' });
    } else if (profile.status === 'REJECTED') {
      await this.prisma.professionalProfile.update({ where: { id: profile.id }, data: { status: 'DRAFT' } });
    }
  }

  async get(userId: string) {
    const p = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        translations: true,
        languages: true,
        offerings: true,
        attributes: true,
        serviceAreas: true,
        rules: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
        exceptions: { where: { date: { gte: new Date(new Date().toISOString().slice(0, 10)) } }, orderBy: { date: 'asc' } },
        qualifications: { include: { documents: true }, orderBy: { createdAt: 'asc' } },
        portrait: true,
        user: { select: { phone: true } },
      },
    });
    if (!p) return null;
    const original = p.translations.find((t) => t.locale === p.originalLocale) ?? p.translations[0];
    const qualifications: QualificationDto[] = p.qualifications.map((q) => ({
      id: q.id,
      kind: q.kind,
      title: q.title,
      issuer: q.issuer,
      issuedYear: q.issuedYear,
      status: q.status,
      rejectionReason: q.rejectionReason,
      verifiedAt: q.verifiedAt?.toISOString() ?? null,
      documents: q.documents.map((d) => ({ id: d.id, originalName: d.originalName, size: d.size, createdAt: d.createdAt.toISOString() })),
    }));
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      rejectionReason: p.rejectionReason,
      onboardingStep: p.onboardingStep,
      submittedAt: p.submittedAt?.toISOString() ?? null,
      approvedAt: p.approvedAt?.toISOString() ?? null,
      intro: {
        displayName: p.displayName,
        headline: original?.headline ?? '',
        bio: original?.bio ?? '',
        originalLocale: p.originalLocale,
        phone: p.user.phone ?? '',
        portraitMediaId: p.portraitMediaId,
        portraitUrl: p.portrait ? this.storage.publicUrl(p.portrait.storageKey) : null,
      },
      translations: p.translations.map((t) => ({ locale: t.locale, headline: t.headline, bio: t.bio })),
      services: { categoryId: p.categoryId, serviceIds: p.offerings.map((o) => o.serviceId), attributeIds: p.attributes.map((a) => a.attributeId) },
      experience: {
        experienceYears: p.experienceYears,
        experienceSummary: p.experienceSummary,
        birthYear: p.birthYear,
        educationLevel: p.educationLevel,
        availableFrom: p.availableFrom?.toISOString().slice(0, 10) ?? null,
      },
      area: { homeLocationId: p.homeLocationId, serviceAreaIds: p.serviceAreas.map((a) => a.locationId) },
      languages: p.languages.map((l) => l.code),
      offerings: p.offerings.map((o) => ({ serviceId: o.serviceId, priceKind: o.priceKind, priceAmount: o.priceAmount, priceUnit: o.priceUnit })),
      rules: p.rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
      exceptions: p.exceptions.map((e) => ({ id: e.id, date: e.date.toISOString().slice(0, 10), available: e.available, startMinute: e.startMinute, endMinute: e.endMinute, note: e.note })),
      qualifications,
      completeness: this.completeness(p),
    };
  }

  private completeness(p: any) {
    const original = p.translations.find((t: any) => t.locale === p.originalLocale);
    return {
      intro: !!(p.displayName && original?.headline && original?.bio && p.user?.phone),
      services: !!(p.categoryId && p.offerings.length),
      experience: p.onboardingStep >= STEP.experience && p.birthYear != null && p.educationLevel != null,
      area: !!(p.homeLocationId && p.serviceAreas.length),
      languages: p.languages.length > 0,
      prices: p.offerings.length > 0 && p.offerings.every((o: any) => o.priceKind === 'NEGOTIABLE' || (o.priceAmount ?? 0) > 0),
      schedule: p.rules.length > 0,
    };
  }

  async create(userId: string) {
    const existing = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (existing) return this.get(userId);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.professionalProfile.create({ data: { userId, slug: profileSlug(user.name), displayName: user.name, originalLocale: user.locale } });
    return this.get(userId);
  }

  async saveIntro(userId: string, input: z.output<typeof onboardingIntroSchema>) {
    const p = await this.own(userId);
    if (input.portraitMediaId) {
      const media = await this.prisma.mediaAsset.findFirst({ where: { id: input.portraitMediaId, ownerId: userId } });
      if (!media) throw new AppError('VALIDATION_FAILED', undefined, { portraitMediaId: ['invalid'] });
    }
    const nameChanged = p.displayName !== input.displayName;
    await this.prisma.$transaction(async (tx) => {
      await tx.professionalProfile.update({
        where: { id: p.id },
        data: { displayName: input.displayName, originalLocale: input.originalLocale, portraitMediaId: input.portraitMediaId ?? null },
      });
      await tx.professionalTranslation.upsert({
        where: { profileId_locale: { profileId: p.id, locale: input.originalLocale } },
        create: { profileId: p.id, locale: input.originalLocale, headline: input.headline, bio: input.bio },
        update: { headline: input.headline, bio: input.bio },
      });
      await tx.user.update({ where: { id: userId }, data: { phone: input.phone } });
    });
    if (nameChanged && p.status === 'APPROVED') await this.materialChange(p);
    await this.bumpStep(p.id, STEP.intro);
    return this.get(userId);
  }

  /** Optional translations supplied by the author. Never machine-generated. */
  async saveTranslation(userId: string, locale: 'hy' | 'ru' | 'en', headline: string, bio: string) {
    const p = await this.own(userId);
    if (locale === p.originalLocale) throw new AppError('VALIDATION_FAILED', undefined, { locale: ['invalid'] });
    if (!headline && !bio) await this.prisma.professionalTranslation.deleteMany({ where: { profileId: p.id, locale } });
    else
      await this.prisma.professionalTranslation.upsert({
        where: { profileId_locale: { profileId: p.id, locale } },
        create: { profileId: p.id, locale, headline, bio },
        update: { headline, bio },
      });
    return this.get(userId);
  }

  async saveServices(userId: string, input: z.output<typeof onboardingServicesSchema>) {
    const p = await this.own(userId);
    const cat = await this.prisma.category.findFirst({ where: { id: input.categoryId, active: true }, include: { services: true } });
    if (!cat) throw new AppError('VALIDATION_FAILED', undefined, { categoryId: ['invalid'] });
    const validServices = new Set(cat.services.filter((s) => s.active).map((s) => s.id));
    if (!input.serviceIds.every((id) => validServices.has(id))) throw new AppError('VALIDATION_FAILED', undefined, { serviceIds: ['invalid'] });

    // Facets are global; some options are restricted to specific categories (e.g. online consultation).
    const attributeIds = [...new Set(input.attributeIds)];
    const attrs = await this.prisma.careAttribute.findMany({ where: { id: { in: attributeIds }, active: true }, select: { id: true, slug: true } });
    const allowed = attrs.every((a) => {
      const def = findFacet(a.slug)?.option;
      return !!def && facetAllowedFor(def, cat.slug);
    });
    if (attrs.length !== attributeIds.length || !allowed) throw new AppError('VALIDATION_FAILED', undefined, { attributeIds: ['invalid'] });

    const current = await this.prisma.professionalService.findMany({ where: { profileId: p.id } });
    const material = p.categoryId !== input.categoryId || input.serviceIds.some((id) => !current.find((c) => c.serviceId === id));
    await this.prisma.$transaction(async (tx) => {
      await tx.professionalProfile.update({ where: { id: p.id }, data: { categoryId: input.categoryId } });
      await tx.professionalService.deleteMany({ where: { profileId: p.id, serviceId: { notIn: input.serviceIds } } });
      for (const serviceId of input.serviceIds) {
        if (!current.find((c) => c.serviceId === serviceId)) {
          await tx.professionalService.create({ data: { profileId: p.id, serviceId, priceKind: 'NEGOTIABLE', priceUnit: 'HOUR' } });
        }
      }
      await tx.professionalAttribute.deleteMany({ where: { profileId: p.id } });
      if (attributeIds.length) await tx.professionalAttribute.createMany({ data: attributeIds.map((attributeId) => ({ profileId: p.id, attributeId })) });
    });
    if (material) await this.materialChange(p);
    await this.bumpStep(p.id, STEP.services);
    return this.get(userId);
  }

  async saveExperience(userId: string, input: z.output<typeof onboardingExperienceSchema>) {
    const p = await this.own(userId);
    await this.prisma.professionalProfile.update({
      where: { id: p.id },
      data: {
        experienceYears: input.experienceYears,
        experienceSummary: input.experienceSummary,
        birthYear: input.birthYear,
        educationLevel: input.educationLevel,
        availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
      },
    });
    await this.bumpStep(p.id, STEP.experience);
    return this.get(userId);
  }

  async saveArea(userId: string, input: z.output<typeof onboardingAreaSchema>) {
    const p = await this.own(userId);
    const ids = [...new Set([input.homeLocationId, ...input.serviceAreaIds])];
    const found = await this.prisma.location.count({ where: { id: { in: ids }, active: true } });
    if (found !== ids.length) throw new AppError('VALIDATION_FAILED', undefined, { serviceAreaIds: ['invalid'] });
    await this.prisma.$transaction([
      this.prisma.professionalProfile.update({ where: { id: p.id }, data: { homeLocationId: input.homeLocationId } }),
      this.prisma.serviceArea.deleteMany({ where: { profileId: p.id } }),
      this.prisma.serviceArea.createMany({ data: [...new Set(input.serviceAreaIds)].map((locationId) => ({ profileId: p.id, locationId })) }),
    ]);
    await this.bumpStep(p.id, STEP.area);
    return this.get(userId);
  }

  async saveLanguages(userId: string, input: z.output<typeof onboardingLanguagesSchema>) {
    const p = await this.own(userId);
    await this.prisma.$transaction([
      this.prisma.professionalLanguage.deleteMany({ where: { profileId: p.id } }),
      this.prisma.professionalLanguage.createMany({ data: [...new Set(input.languages)].map((code) => ({ profileId: p.id, code })) }),
    ]);
    await this.bumpStep(p.id, STEP.languages);
    return this.get(userId);
  }

  async savePrices(userId: string, input: z.output<typeof onboardingPricesSchema>) {
    const p = await this.own(userId);
    const current = await this.prisma.professionalService.findMany({ where: { profileId: p.id } });
    for (const o of input.offerings) {
      if (!current.find((c) => c.serviceId === o.serviceId)) throw new AppError('VALIDATION_FAILED', undefined, { offerings: ['invalid'] });
    }
    await this.prisma.$transaction(
      input.offerings.map((o) =>
        this.prisma.professionalService.update({
          where: { profileId_serviceId: { profileId: p.id, serviceId: o.serviceId } },
          data: { priceKind: o.priceKind, priceAmount: o.priceKind === 'FIXED' ? o.priceAmount : null, priceUnit: o.priceUnit },
        }),
      ),
    );
    const hourly = input.offerings.filter((o) => o.priceKind === 'FIXED' && o.priceUnit === 'HOUR').map((o) => o.priceAmount!);
    await this.prisma.professionalProfile.update({ where: { id: p.id }, data: { minHourlyPrice: hourly.length ? Math.min(...hourly) : null } });
    await this.bumpStep(p.id, STEP.prices);
    return this.get(userId);
  }

  async saveSchedule(userId: string, input: z.output<typeof onboardingScheduleSchema>) {
    const p = await this.own(userId);
    // Reject overlapping windows on the same weekday.
    for (let d = 1; d <= 7; d++) {
      const rs = input.rules.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < rs.length; i++) if (rs[i].startMinute < rs[i - 1].endMinute) throw new AppError('VALIDATION_FAILED', undefined, { rules: ['overlap'] });
    }
    await this.prisma.$transaction([
      this.prisma.availabilityRule.deleteMany({ where: { profileId: p.id } }),
      this.prisma.availabilityRule.createMany({ data: input.rules.map((r) => ({ profileId: p.id, ...r })) }),
    ]);
    await this.bumpStep(p.id, STEP.schedule);
    return this.get(userId);
  }

  async addException(userId: string, input: z.output<typeof availabilityExceptionSchema>) {
    const p = await this.own(userId);
    if (input.date < new Date().toISOString().slice(0, 10)) throw new AppError('START_IN_PAST');
    await this.prisma.availabilityException.create({
      data: { profileId: p.id, date: new Date(input.date), available: input.available, startMinute: input.startMinute ?? null, endMinute: input.endMinute ?? null, note: input.note },
    });
    return this.get(userId);
  }

  async removeException(userId: string, id: string) {
    const p = await this.own(userId);
    await this.prisma.availabilityException.deleteMany({ where: { id, profileId: p.id } });
    return this.get(userId);
  }

  async addQualification(userId: string, input: z.output<typeof qualificationInputSchema>) {
    const p = await this.own(userId);
    const count = await this.prisma.qualification.count({ where: { profileId: p.id } });
    if (count >= 15) throw new AppError('VALIDATION_FAILED', undefined, { qualifications: ['too_many'] });
    await this.prisma.qualification.create({ data: { profileId: p.id, kind: input.kind, title: input.title, issuer: input.issuer, issuedYear: input.issuedYear ?? null } });
    return this.get(userId);
  }

  /** Editing a credential's claims resets its verification: the old badge never stays attached to changed evidence. */
  async updateQualification(userId: string, id: string, input: z.output<typeof qualificationInputSchema>) {
    const p = await this.own(userId);
    const q = await this.prisma.qualification.findFirst({ where: { id, profileId: p.id } });
    if (!q) throw new AppError('NOT_FOUND');
    const changed = q.kind !== input.kind || q.title !== input.title || q.issuer !== input.issuer || q.issuedYear !== (input.issuedYear ?? null);
    await this.prisma.qualification.update({
      where: { id },
      data: {
        kind: input.kind,
        title: input.title,
        issuer: input.issuer,
        issuedYear: input.issuedYear ?? null,
        ...(changed ? { status: 'PENDING', verifiedAt: null, verifiedById: null, reviewedAt: null, rejectionReason: null } : {}),
      },
    });
    return this.get(userId);
  }

  async removeQualification(userId: string, id: string) {
    const p = await this.own(userId);
    const q = await this.prisma.qualification.findFirst({ where: { id, profileId: p.id }, include: { documents: true } });
    if (!q) throw new AppError('NOT_FOUND');
    await this.prisma.$transaction([
      this.prisma.privateDocument.deleteMany({ where: { qualificationId: id } }),
      this.prisma.qualification.delete({ where: { id } }),
    ]);
    for (const d of q.documents) await this.storage.remove('private', d.storageKey);
    return this.get(userId);
  }

  async removeDocument(userId: string, docId: string) {
    const doc = await this.prisma.privateDocument.findFirst({ where: { id: docId, ownerId: userId }, include: { qualification: true } });
    if (!doc) throw new AppError('NOT_FOUND');
    await this.prisma.$transaction(async (tx) => {
      await tx.privateDocument.delete({ where: { id: docId } });
      if (doc.qualification && doc.qualification.status === 'VERIFIED') {
        await tx.qualification.update({ where: { id: doc.qualification.id }, data: { status: 'PENDING', verifiedAt: null, verifiedById: null } });
      }
    });
    await this.storage.remove('private', doc.storageKey);
    return this.get(userId);
  }

  /** Documents are optional; visiting the step records progress so the wizard can resume at the preview. */
  async documentsVisited(userId: string) {
    const p = await this.own(userId);
    await this.bumpStep(p.id, STEP.documents);
    return this.get(userId);
  }

  async submit(userId: string) {
    const p = await this.own(userId);
    if (p.status === 'PENDING' || p.status === 'APPROVED') return this.get(userId);
    const full = await this.get(userId);
    const missing = Object.entries(full!.completeness)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    if (missing.length) throw new AppError('PROFILE_INCOMPLETE', { missing: missing.join(',') });
    await this.prisma.professionalProfile.update({ where: { id: p.id }, data: { status: 'PENDING', submittedAt: new Date(), rejectionReason: null, onboardingStep: 9 } });
    await this.notifications.notify(userId, 'PROFILE_SUBMITTED', {});
    return this.get(userId);
  }
}

const translationSchema = z.object({
  locale: z.enum(['hy', 'ru', 'en']),
  headline: z.string().trim().max(120, 'too_long').default(''),
  bio: z.string().trim().max(3000, 'too_long').default(''),
});

@ApiTags('professional-self')
@Controller('me/professional')
@Auth()
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get()
  async get(@CurrentUser() u: AuthUser) {
    return { profile: await this.service.get(u.id) };
  }

  @Post()
  create(@CurrentUser() u: AuthUser) {
    return this.service.create(u.id);
  }

  @Put('intro')
  @ApiZodBody(onboardingIntroSchema)
  intro(@CurrentUser() u: AuthUser, @ZBody(onboardingIntroSchema) b: z.output<typeof onboardingIntroSchema>) {
    return this.service.saveIntro(u.id, b);
  }

  @Put('translations')
  @ApiZodBody(translationSchema)
  translation(@CurrentUser() u: AuthUser, @ZBody(translationSchema) b: z.output<typeof translationSchema>) {
    return this.service.saveTranslation(u.id, b.locale, b.headline, b.bio);
  }

  @Put('services')
  @ApiZodBody(onboardingServicesSchema)
  services(@CurrentUser() u: AuthUser, @ZBody(onboardingServicesSchema) b: z.output<typeof onboardingServicesSchema>) {
    return this.service.saveServices(u.id, b);
  }

  @Put('experience')
  @ApiZodBody(onboardingExperienceSchema)
  experience(@CurrentUser() u: AuthUser, @ZBody(onboardingExperienceSchema) b: z.output<typeof onboardingExperienceSchema>) {
    return this.service.saveExperience(u.id, b);
  }

  @Put('area')
  @ApiZodBody(onboardingAreaSchema)
  area(@CurrentUser() u: AuthUser, @ZBody(onboardingAreaSchema) b: z.output<typeof onboardingAreaSchema>) {
    return this.service.saveArea(u.id, b);
  }

  @Put('languages')
  @ApiZodBody(onboardingLanguagesSchema)
  languages(@CurrentUser() u: AuthUser, @ZBody(onboardingLanguagesSchema) b: z.output<typeof onboardingLanguagesSchema>) {
    return this.service.saveLanguages(u.id, b);
  }

  @Put('prices')
  @ApiZodBody(onboardingPricesSchema)
  prices(@CurrentUser() u: AuthUser, @ZBody(onboardingPricesSchema) b: z.output<typeof onboardingPricesSchema>) {
    return this.service.savePrices(u.id, b);
  }

  @Put('schedule')
  @ApiZodBody(onboardingScheduleSchema)
  schedule(@CurrentUser() u: AuthUser, @ZBody(onboardingScheduleSchema) b: z.output<typeof onboardingScheduleSchema>) {
    return this.service.saveSchedule(u.id, b);
  }

  @Post('exceptions')
  @ApiZodBody(availabilityExceptionSchema)
  addException(@CurrentUser() u: AuthUser, @ZBody(availabilityExceptionSchema) b: z.output<typeof availabilityExceptionSchema>) {
    return this.service.addException(u.id, b);
  }

  @Delete('exceptions/:id')
  removeException(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.removeException(u.id, id);
  }

  @Post('qualifications')
  @ApiZodBody(qualificationInputSchema)
  addQualification(@CurrentUser() u: AuthUser, @ZBody(qualificationInputSchema) b: z.output<typeof qualificationInputSchema>) {
    return this.service.addQualification(u.id, b);
  }

  @Put('qualifications/:id')
  @ApiZodBody(qualificationInputSchema)
  updateQualification(@CurrentUser() u: AuthUser, @Param('id') id: string, @ZBody(qualificationInputSchema) b: z.output<typeof qualificationInputSchema>) {
    return this.service.updateQualification(u.id, id, b);
  }

  @Delete('qualifications/:id')
  removeQualification(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.removeQualification(u.id, id);
  }

  @Delete('documents/:id')
  removeDocument(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.removeDocument(u.id, id);
  }

  @Post('documents-step')
  @HttpCode(200)
  documentsStep(@CurrentUser() u: AuthUser) {
    return this.service.documentsVisited(u.id);
  }

  @Post('submit')
  @HttpCode(200)
  submit(@CurrentUser() u: AuthUser) {
    return this.service.submit(u.id);
  }
}

@Module({ imports: [MediaModule], controllers: [OnboardingController], providers: [OnboardingService] })
export class OnboardingModule {}
