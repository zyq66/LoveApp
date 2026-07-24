import type { ImagePickerAsset } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db, authReady } from '../config/cloudbase';
import { deleteFiles, uploadFile } from './storage';
import { watchCollection } from './realtime';

export interface Photo {
  id: string;
  coupleId: string;
  url: string; // legacy-compatible display URL
  originalUrl: string;
  thumbnailUrl: string;
  originalFileId?: string;
  thumbnailFileId?: string;
  caption: string;
  date: number; // legacy-compatible timestamp
  shotAt: number;
  uploadedAt: number;
  uploadedBy: string;
  rollId?: string;
  hiddenUntil?: number;
  width?: number;
  height?: number;
  dateKey: string;
  monthDay: string;
  reactions: Record<string, string>;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateParts(ms: number): { dateKey: string; monthDay: string } {
  const date = new Date(ms);
  return {
    dateKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    monthDay: `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
  };
}

function exifTimestamp(exif: Record<string, unknown> | null | undefined): number {
  if (!exif) return Date.now();
  const raw = exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime;
  if (typeof raw === 'number') return raw > 1e12 ? raw : raw * 1000;
  if (typeof raw === 'string') {
    // Common EXIF form: 2026:07:24 18:30:12
    const normalized = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const parsed = new Date(normalized).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

export function normalizePhoto(doc: any): Photo {
  const shotAt = Number(doc.shotAt || doc.date || doc.uploadedAt || doc.createdAt || Date.now());
  const fallback = dateParts(shotAt);
  const originalUrl = doc.originalUrl || doc.url || '';
  return {
    ...doc,
    id: doc.id || doc._id,
    coupleId: doc.coupleId || '',
    url: originalUrl,
    originalUrl,
    thumbnailUrl: doc.thumbnailUrl || originalUrl,
    caption: doc.caption || '',
    date: shotAt,
    shotAt,
    uploadedAt: Number(doc.uploadedAt || doc.date || shotAt),
    uploadedBy: doc.uploadedBy || '',
    hiddenUntil: Number(doc.hiddenUntil || 0),
    dateKey: doc.dateKey || fallback.dateKey,
    monthDay: doc.monthDay || fallback.monthDay,
    reactions: doc.reactions || {},
  } as Photo;
}

async function createThumbnail(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 720 } }],
      { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}

export async function uploadPhotoAsset(
  coupleId: string,
  userId: string,
  asset: Pick<ImagePickerAsset, 'uri' | 'width' | 'height' | 'exif'>,
  caption = '',
  rollId?: string,
  hiddenUntil?: number,
): Promise<void> {
  await authReady;
  const shotAt = exifTimestamp(asset.exif as Record<string, unknown> | null | undefined);
  const { dateKey, monthDay } = dateParts(shotAt);
  const thumbnailUri = await createThumbnail(asset.uri);
  const [original, thumbnail] = await Promise.all([
    uploadFile(asset.uri, 'album/originals'),
    uploadFile(thumbnailUri, 'album/thumbnails'),
  ]);

  await db.collection('photos').add({
    coupleId,
    rollId: rollId || '',
    hiddenUntil: hiddenUntil || 0,
    url: original.url,
    originalUrl: original.url,
    thumbnailUrl: thumbnail.url,
    originalFileId: original.fileId,
    thumbnailFileId: thumbnail.fileId,
    caption: caption.trim(),
    date: shotAt,
    shotAt,
    uploadedAt: Date.now(),
    uploadedBy: userId,
    width: asset.width || 0,
    height: asset.height || 0,
    dateKey,
    monthDay,
    reactions: {},
  });
}

// Legacy call retained for avatar-era call sites while the UI is migrated.
export async function uploadPhoto(
  coupleId: string,
  userId: string,
  uri: string,
  caption: string,
): Promise<void> {
  return uploadPhotoAsset(coupleId, userId, { uri, width: 0, height: 0 }, caption);
}

export async function uploadPhotoBatch(
  coupleId: string,
  userId: string,
  assets: ImagePickerAsset[],
  rollId?: string,
  hiddenUntil?: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  let completed = 0;
  for (const asset of assets) {
    await uploadPhotoAsset(coupleId, userId, asset, '', rollId, hiddenUntil);
    completed += 1;
    onProgress?.(completed, assets.length);
  }
}

export async function fetchPhotos(_coupleId?: string): Promise<Photo[]> {
  await authReady;
  // This is a private two-person environment. Reading all photos intentionally
  // restores 12 legacy photos whose former couple documents no longer exist.
  const result = await db.collection('photos').limit(200).get();
  return ((result.data as any[]) ?? [])
    .map(normalizePhoto)
    .sort((a, b) => b.shotAt - a.shotAt);
}

export async function addPhotoReaction(photoId: string, userId: string, emoji: string): Promise<void> {
  await authReady;
  await db.collection('photos').doc(photoId).update({
    [`reactions.${userId}`]: emoji,
  });
}

export async function removePhotoReaction(photoId: string, userId: string): Promise<void> {
  await authReady;
  await db.collection('photos').doc(photoId).update({
    [`reactions.${userId}`]: '',
  });
}

export async function deletePhoto(_coupleId: string, photoId: string, userId?: string): Promise<void> {
  await authReady;
  const result: any = await db.collection('photos').doc(photoId).get();
  const raw = ((result.data as any[]) ?? [])[0];
  if (!raw) throw new Error('照片不存在');
  if (userId && raw.uploadedBy !== userId) throw new Error('只能撤回自己发布的照片');

  await db.collection('photos').doc(photoId).remove();
  await deleteFiles([raw.originalFileId, raw.thumbnailFileId]);
}

export function watchPhotos(
  _coupleId: string,
  onChange: (photos: Photo[]) => void,
): () => void {
  return watchCollection<Photo>({
    buildQuery: () => db.collection('photos'),
    mapper: normalizePhoto,
    onChange: photos => onChange(photos.sort((a, b) => b.shotAt - a.shotAt)),
    debugLabel: 'watchPhotos',
  });
}
