import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { env } from '../config/env';
import { AppError } from '../common/app-error';

export type Visibility = 'public' | 'private';

/**
 * Storage adapter. "local" writes under STORAGE_LOCAL_DIR/{public,private}; "s3" uses two buckets.
 * Private objects are never exposed by URL — they are streamed only through authorized endpoints.
 */
@Injectable()
export class StorageService {
  private s3: any = null;
  private root = resolve(process.cwd(), env.STORAGE_LOCAL_DIR);

  private localPath(visibility: Visibility, key: string) {
    if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new AppError('NOT_FOUND');
    const p = resolve(this.root, visibility, key);
    if (!p.startsWith(resolve(this.root, visibility) + sep)) throw new AppError('NOT_FOUND');
    return p;
  }

  private async client() {
    if (this.s3) return this.s3;
    if (!env.S3_BUCKET_PUBLIC || !env.S3_BUCKET_PRIVATE || !env.S3_ACCESS_KEY_ID) throw new AppError('STORAGE_NOT_CONFIGURED');
    let mod: any;
    try {
      mod = await import('@aws-sdk/client-s3');
    } catch {
      throw new AppError('STORAGE_NOT_CONFIGURED');
    }
    this.s3 = {
      mod,
      client: new mod.S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT || undefined,
        forcePathStyle: !!env.S3_ENDPOINT,
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
      }),
    };
    return this.s3;
  }

  private bucket(v: Visibility) {
    return v === 'public' ? env.S3_BUCKET_PUBLIC : env.S3_BUCKET_PRIVATE;
  }

  async put(visibility: Visibility, key: string, data: Buffer, contentType: string) {
    if (env.STORAGE_DRIVER === 'local') {
      const p = this.localPath(visibility, key);
      await mkdir(dirname(p), { recursive: true });
      await writeFile(p, data, { mode: 0o640 });
      return;
    }
    const { mod, client } = await this.client();
    await client.send(
      new mod.PutObjectCommand({
        Bucket: this.bucket(visibility),
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: visibility === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      }),
    );
  }

  async get(visibility: Visibility, key: string): Promise<Readable> {
    if (env.STORAGE_DRIVER === 'local') {
      const p = this.localPath(visibility, key);
      if (!existsSync(p)) throw new AppError('NOT_FOUND');
      return createReadStream(p);
    }
    const { mod, client } = await this.client();
    try {
      const out = await client.send(new mod.GetObjectCommand({ Bucket: this.bucket(visibility), Key: key }));
      return out.Body as Readable;
    } catch {
      throw new AppError('NOT_FOUND');
    }
  }

  async remove(visibility: Visibility, key: string) {
    if (env.STORAGE_DRIVER === 'local') {
      await unlink(this.localPath(visibility, key)).catch(() => undefined);
      return;
    }
    const { mod, client } = await this.client();
    await client.send(new mod.DeleteObjectCommand({ Bucket: this.bucket(visibility), Key: key })).catch(() => undefined);
  }

  /** URL used by the web app for public media. */
  publicUrl(key: string): string {
    if (env.STORAGE_DRIVER === 's3' && env.S3_PUBLIC_BASE_URL) return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
    return `/api/media/${key}`;
  }
}
