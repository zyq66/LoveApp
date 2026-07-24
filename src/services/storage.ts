// src/services/storage.ts
import { app } from '../config/cloudbase';

const TCB_STORAGE_DOMAIN = '6c6f-loveapp-d0gwjimribc470041-1423004109.tcb.qcloud.la';

export interface UploadedFile {
  url: string;
  cloudPath: string;
  fileId: string;
}

/**
 * Upload a local image URI to TCB Cloud Storage.
 * Returns a permanent public URL (bucket is set to public read).
 */
export async function uploadImage(uri: string, folder: string): Promise<string> {
  return (await uploadFile(uri, folder)).url;
}

export async function uploadFile(uri: string, folder: string): Promise<UploadedFile> {
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Fetch the file as a blob so TCB SDK can handle it in React Native
  const response = await fetch(uri);
  const blob = await response.blob();

  const result: any = await app.uploadFile({
    cloudPath,
    filePath: blob as any,
  });

  return {
    url: `https://${TCB_STORAGE_DOMAIN}/${cloudPath}`,
    cloudPath,
    fileId: result?.fileID || result?.fileId || '',
  };
}

export async function deleteFiles(fileIds: string[]): Promise<void> {
  const valid = fileIds.filter(Boolean);
  if (valid.length === 0) return;
  try {
    await (app as any).deleteFile({ fileList: valid });
  } catch {
    // A failed storage cleanup must not bring back a photo deleted by its owner.
  }
}
