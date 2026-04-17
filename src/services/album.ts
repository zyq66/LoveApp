// src/services/album.ts
import { db } from '../config/cloudbase';
import { uploadImage } from './storage';

export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: number;
  uploadedBy: string;
}

export async function uploadPhoto(coupleId: string, userId: string, uri: string, caption: string): Promise<void> {
  const url = await uploadImage(uri, 'album');
  await db.collection('photos').add({
    coupleId, url, caption, date: Date.now(), uploadedBy: userId,
  });
}

export function listenPhotos(coupleId: string, callback: (photos: Photo[]) => void) {
  const watcher = db.collection('photos')
    .where({ coupleId })
    .watch({
      onChange: (snapshot: any) => {
        const photos = (snapshot.docs as any[])
          .map(d => ({ ...d, id: d._id }))
          .sort((a: any, b: any) => b.date - a.date) as Photo[];
        callback(photos);
      },
      onError: (err: any) => console.error('listenPhotos error', err),
    });
  return () => watcher.close();
}

export async function deletePhoto(coupleId: string, photoId: string): Promise<void> {
  await db.collection('photos').doc(photoId).remove();
}
