import { Module } from '@nestjs/common';
import { LocalStorageAdapter } from './local-storage.adapter';
import { STORAGE_PROVIDER } from './storage.interface';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageAdapter,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
