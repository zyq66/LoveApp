import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import BackgroundService from 'react-native-background-actions';
import { Photo, watchPhotos } from './album';
import {
  ensurePhotoNotificationPermission,
  PHOTO_NOTIFICATIONS_KEY,
  showIncomingPhotoNotification,
} from './notifications';

interface SyncParameters {
  coupleId: string;
  userId: string;
  partnerName: string;
}

function parseIds(value: string | null): Set<string> {
  if (!value) return new Set();
  try {
    return new Set(JSON.parse(value) as string[]);
  } catch {
    return new Set();
  }
}

async function photoSyncTask(parameters?: SyncParameters): Promise<void> {
  if (!parameters) return;
  const { coupleId, userId, partnerName } = parameters;
  const notifiedKey = `notified_photo_ids_${userId}`;
  const notified = parseIds(await AsyncStorage.getItem(notifiedKey));
  let firstSnapshot = true;
  let latestPhotos: Photo[] = [];
  let processing = false;

  async function processPhotos(photos: Photo[], initialize = false) {
    if (processing) return;
    processing = true;
    try {
      const now = Date.now();
      const eligible = photos
        .filter(photo => photo.uploadedBy !== userId)
        .filter(photo => !photo.hiddenUntil || photo.hiddenUntil <= now)
        .sort((a, b) => b.uploadedAt - a.uploadedAt);

      if (initialize && notified.size === 0) {
        eligible.forEach(photo => notified.add(photo.id));
      } else {
        const fresh = eligible.filter(photo => !notified.has(photo.id));
        if (fresh[0]) {
          await showIncomingPhotoNotification({
            partnerName,
            photoId: fresh[0].id,
            rollId: fresh[0].rollId,
            secretUnlocked: !!fresh[0].hiddenUntil,
          });
          fresh.forEach(photo => notified.add(photo.id));
        }
      }

      const orderedIds = photos.map(photo => photo.id).filter(id => notified.has(id)).slice(0, 300);
      await AsyncStorage.setItem(notifiedKey, JSON.stringify(orderedIds));
    } finally {
      processing = false;
    }
  }

  await new Promise<void>(resolve => {
    const unsubscribe = watchPhotos(coupleId, photos => {
      latestPhotos = photos;
      processPhotos(photos, firstSnapshot).catch(() => {});
      firstSnapshot = false;
    });

    // Besides keeping the service alive, this wakes a secret roll at its
    // reveal time even when no database write occurs at that exact moment.
    const timer = setInterval(() => {
      if (!BackgroundService.isRunning()) {
        clearInterval(timer);
        unsubscribe();
        resolve();
        return;
      }
      processPhotos(latestPhotos).catch(() => {});
    }, 60000);
  });
}

function canRunNativeService(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership !== 'expo';
}

export async function startPhotoBackgroundSync(parameters: SyncParameters): Promise<boolean> {
  if (!canRunNativeService()) return false;
  const enabled = await AsyncStorage.getItem(PHOTO_NOTIFICATIONS_KEY);
  if (enabled === 'false') return false;
  const granted = await ensurePhotoNotificationPermission();
  if (!granted) return false;

  if (BackgroundService.isRunning()) await BackgroundService.stop();
  await BackgroundService.start(photoSyncTask, {
    taskName: 'LoveLetterPhotoSync',
    taskTitle: 'LoveLetter 正在守护我们的回忆',
    taskDesc: '新照片会在这里悄悄提醒你',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#ff8fab',
    foregroundServiceType: ['remoteMessaging'],
    parameters,
  });
  return true;
}

export async function stopPhotoBackgroundSync(): Promise<void> {
  if (canRunNativeService() && BackgroundService.isRunning()) await BackgroundService.stop();
}
