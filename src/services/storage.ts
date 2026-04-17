// src/services/storage.ts
import { app } from '../config/cloudbase';

const TCB_STORAGE_DOMAIN = '6c6f-loveapp-d0gwjimribc470041-1423004109.tcb.qcloud.la';

/**
 * Upload a local image URI to TCB Cloud Storage.
 * Returns a permanent public URL (bucket is set to public read).
 */
export async function uploadImage(uri: string, folder: string): Promise<string> {
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Fetch the file as a blob so TCB SDK can handle it in React Native
  const response = await fetch(uri);
  const blob = await response.blob();

  await app.uploadFile({
    cloudPath,
    filePath: blob as any,
  });

  return `https://${TCB_STORAGE_DOMAIN}/${cloudPath}`;
}
