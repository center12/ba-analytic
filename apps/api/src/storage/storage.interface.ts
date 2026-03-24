export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface IStorageProvider {
  /**
   * Upload a file buffer and return the storage key (path).
   */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>;

  /**
   * Return a URL/path that can be used to serve the file.
   * For local storage this is just the file path.
   * For S3-compatible providers this is a pre-signed URL.
   */
  getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;

  /**
   * Delete a file by its storage key.
   */
  delete(key: string): Promise<void>;
}
