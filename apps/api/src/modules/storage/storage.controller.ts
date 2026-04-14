import { Controller, Get, Param, Res, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { lookup as mimeLookup } from 'mime-types';
import { STORAGE_PROVIDER, IStorageProvider } from './storage.interface';
import { Public } from '../auth/decorators/public.decorator';

@Controller('storage')
export class StorageController {
  private readonly uploadDir: string;

  constructor(
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {
    this.uploadDir = path.resolve(config.get<string>('UPLOAD_DIR', './uploads'));
  }

  @Public()
  @Get('*')
  serveFile(@Param('0') key: string, @Res() res: any) {
    const filePath = path.join(this.uploadDir, key);

    // Prevent path traversal
    if (!filePath.startsWith(this.uploadDir + path.sep) && filePath !== this.uploadDir) {
      throw new NotFoundException();
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    const mimeType = mimeLookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(filePath).pipe(res);
  }
}
