import { Controller, Get, Param, Res, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { lookup as mimeLookup } from 'mime-types';
import { STORAGE_PROVIDER, IStorageProvider } from './storage.interface';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Storage')
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
  @ApiOperation({
    summary: 'Serve a stored file',
    description: 'This endpoint is public and streams files directly from the configured upload directory.',
    security: [],
  })
  @ApiParam({ name: '0', description: 'Wildcard path for the storage object key.' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Binary file stream.',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'File not found or invalid path.' })
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
