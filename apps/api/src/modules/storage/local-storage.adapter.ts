import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageProvider } from './storage.interface';

@Injectable()
export class LocalStorageAdapter implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = path.resolve(config.get<string>('UPLOAD_DIR', './uploads'));
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    this.logger.log(`Saved file: ${filePath} (${mimeType})`);
    return key;
  }

  async getSignedUrl(key: string, _ttlSeconds?: number): Promise<string> {
    // Local adapter returns the absolute file path — suitable for reading by AI providers.
    // In production, replace with a pre-signed S3 URL.
    return path.join(this.uploadDir, key);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    await fs.unlink(filePath).catch(() => {
      this.logger.warn(`File not found for deletion: ${filePath}`);
    });
  }
}
