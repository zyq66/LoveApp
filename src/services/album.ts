import { db, authReady } from '../config/cloudbase';
import { uploadImage } from './storage';
import { watchCollection } from './realtime';

export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: number;
  uploadedBy: string;
  reactions: Record<string, string>; // { [userId]: emoji }
}

export async function uploadPhoto(coupleId: string, userId: string, uri: string, caption: string): Promise<void> {
  const url = await uploadImage(uri, 'album');
  await db.collection('photos').add({
    coupleId, url, caption, date: Date.now(), uploadedBy: userId, reactions: {},
  });
}

export async function fetchPhotos(coupleId: string): Promise<Photo[]> {
  await authReady;
  const res = await db.collection('photos')
    .where({ coupleId })
    .orderBy('date', 'desc')
    .limit(200)
    .get();
  return ((res.data as any[]) ?? [])
    .map(d => ({ reactions: {}, ...d, id: d._id })) as Photo[];
}

export async function addPhotoReaction(photoId: string, userId: string, emoji: string): Promise<void> {
  await authReady;
  await db.collection('photos').doc(photoId).update({
    [`reactions.${userId}`]: emoji,
  });
}

export async function removePhotoReaction(photoId: string, userId: string): Promise<void> {
  await authReady;
  // TCB 不支持 unset，用空字符串覆盖后在读取时过滤
  await db.collection('photos').doc(photoId).update({
    [`reactions.${userId}`]: '',
  });
}

export async function deletePhoto(coupleId: string, photoId: string, userId?: string): Promise<void> {
  await authReady;
  if (userId) {
    const res: any = await db.collection('photos').doc(photoId).get();
    const photo = ((res.data as any[]) ?? [])[0];
    if (!photo || photo.coupleId !== coupleId) throw new Error('照片不存在');
    if (photo.uploadedBy !== userId) throw new Error('只能撤回自己发布的照片');
  }
  await db.collection('photos').doc(photoId).remove();
}

export function watchPhotos(
  coupleId: string,
  onChange: (photos: Photo[]) => void,
): () => void {
  return watchCollection<Photo>({
    buildQuery: () => db.collection('photos').where({ coupleId }),
    mapper: (d: any) => ({ reactions: {}, ...d, id: d._id }) as Photo,
    onChange: (photos) => {
      photos.sort((a, b) => b.date - a.date);
      onChange(photos);
    },
    debugLabel: 'watchPhotos',
  });
}
