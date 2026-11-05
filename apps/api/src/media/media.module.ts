import { Controller, Get, Injectable, Module, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { LIMITS } from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { Auth, AuthUser, CurrentUser, RateLimit } from '../common/http';
import { StorageService } from './storage.service';

type Upload = { buffer: Buffer; size: number; originalname: string; mimetype: string };

/** Detect type from magic bytes — never trust the client-declared MIME type or extension. */
export function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

const rid = () => randomBytes(16).toString('hex');

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadPortrait(userId: string, file: Upload | undefined) {
    if (!file) throw new AppError('VALIDATION_FAILED', undefined, { file: ['required'] });
    if (file.size > LIMITS.portraitMaxBytes) throw new AppError('FILE_TOO_LARGE', { maxMb: LIMITS.portraitMaxBytes / 1024 / 1024 });
    const type = sniff(file.buffer);
    if (!type || type.mime === 'application/pdf') throw new AppError('FILE_TYPE_NOT_ALLOWED');

    // Resize and re-encode (strips metadata such as GPS EXIF).
    let out: Buffer;
    let width = 0;
    let height = 0;
    try {
      const sharp = (await import('sharp')).default;
      const img = sharp(file.buffer, { limitInputPixels: 40_000_000 }).rotate().resize(720, 720, { fit: 'cover', position: 'attention' }).webp({ quality: 82 });
      const { data, info } = await img.toBuffer({ resolveWithObject: true });
      out = data;
      width = info.width;
      height = info.height;
    } catch {
      throw new AppError('FILE_TYPE_NOT_ALLOWED');
    }
    const key = `portraits/${rid()}.webp`;
    await this.storage.put('public', key, out, 'image/webp');
    const asset = await this.prisma.mediaAsset.create({ data: { ownerId: userId, storageKey: key, mimeType: 'image/webp', width, height, size: out.length } });
    return { id: asset.id, url: this.storage.publicUrl(key) };
  }

  async uploadDocument(userId: string, qualificationId: string, file: Upload | undefined) {
    if (!file) throw new AppError('VALIDATION_FAILED', undefined, { file: ['required'] });
    const q = await this.prisma.qualification.findFirst({ where: { id: qualificationId, profile: { userId } }, include: { profile: true } });
    if (!q) throw new AppError('NOT_FOUND');
    if (file.size > LIMITS.documentMaxBytes) throw new AppError('FILE_TOO_LARGE', { maxMb: LIMITS.documentMaxBytes / 1024 / 1024 });
    const type = sniff(file.buffer);
    if (!type) throw new AppError('FILE_TYPE_NOT_ALLOWED');
    const count = await this.prisma.privateDocument.count({ where: { qualificationId } });
    if (count >= 5) throw new AppError('VALIDATION_FAILED', undefined, { file: ['too_many'] });

    const key = `documents/${userId}/${rid()}.${type.ext}`;
    await this.storage.put('private', key, file.buffer, type.mime);
    const safeName = file.originalname.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150) || `document.${type.ext}`;
    const doc = await this.prisma.$transaction(async (tx) => {
      const d = await tx.privateDocument.create({
        data: { ownerId: userId, qualificationId, storageKey: key, originalName: safeName, mimeType: type.mime, size: file.size },
      });
      // New evidence invalidates an earlier decision: the credential returns to review.
      if (q.status !== 'PENDING') {
        await tx.qualification.update({ where: { id: q.id }, data: { status: 'PENDING', verifiedAt: null, verifiedById: null, reviewedAt: null } });
      }
      return d;
    });
    return { id: doc.id, originalName: doc.originalName, size: doc.size, createdAt: doc.createdAt.toISOString() };
  }
}

@ApiTags('media')
@Controller()
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly storage: StorageService,
  ) {}

  @Post('me/portrait')
  @Auth()
  @RateLimit('upload', 30, 3600)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LIMITS.portraitMaxBytes + 1024, files: 1 } }))
  uploadPortrait(@CurrentUser() user: AuthUser, @UploadedFile() file: Upload) {
    return this.media.uploadPortrait(user.id, file);
  }

  @Post('me/qualifications/:id/documents')
  @Auth()
  @RateLimit('upload', 30, 3600)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LIMITS.documentMaxBytes + 1024, files: 1 } }))
  uploadDocument(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFile() file: Upload) {
    return this.media.uploadDocument(user.id, id, file);
  }

  /** Public portraits only. Private documents are never served from here. */
  @Get('media/portraits/:file')
  async portrait(@Param('file') file: string, @Res() res: Response) {
    if (!/^[a-f0-9]{32}\.webp$/.test(file)) throw new AppError('NOT_FOUND');
    const stream = await this.storage.get('public', `portraits/${file}`);
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(res);
  }
}

@Module({ controllers: [MediaController], providers: [MediaService, StorageService], exports: [StorageService, MediaService] })
export class MediaModule {}
