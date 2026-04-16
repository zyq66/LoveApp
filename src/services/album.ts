// src/services/album.ts
import { db } from '../config/firebase';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from '../config/cloudinary';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: number;
  uploadedBy: string;
}

export async function uploadPhoto(
  coupleId: string,
  userId: string,
  uri: string,
  caption: string,
): Promise<void> {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('上传失败');
  const data = await res.json();
  const url: string = data.secure_url;

  await addDoc(collection(db, `albums/${coupleId}/photos`), {
    url, caption, date: Date.now(), uploadedBy: userId,
  });
}

export function listenPhotos(coupleId: string, callback: (photos: Photo[]) => void) {
  const q = query(collection(db, `albums/${coupleId}/photos`), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
  });
}

export async function deletePhoto(coupleId: string, photoId: string): Promise<void> {
  await deleteDoc(doc(db, `albums/${coupleId}/photos/${photoId}`));
}
