import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

export const PHOTO_NOTIFICATIONS_KEY = 'photo_notifications_enabled';

let notificationsModule: typeof ExpoNotifications | null | undefined;

function isAndroidExpoGo(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

export function getNotificationsModule(): typeof ExpoNotifications | null {
  if (isAndroidExpoGo()) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  notificationsModule = require('expo-notifications') as typeof ExpoNotifications;
  return notificationsModule;
}

export function setupNotificationHandler(): void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensurePhotoNotificationPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('photos', {
      name: '我们的新照片',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#ff8fab',
      sound: 'default',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function readLastNotificationResponse(onData: (data: any) => void): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) onData(response.notification.request.content.data as any);
}

export function addNotificationResponseListener(onData: (data: any) => void): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    onData(response.notification.request.content.data as any);
  });
  return () => subscription.remove();
}

export async function showIncomingPhotoNotification(data: {
  partnerName: string;
  photoId: string;
  rollId?: string;
  secretUnlocked?: boolean;
}): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const granted = await ensurePhotoNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: data.secretUnlocked
        ? '秘密胶卷到揭晓时间了 ✦'
        : `${data.partnerName || 'TA'} 放进来一张新照片`,
      body: data.secretUnlocked
        ? '去看看你们分别藏进了什么。'
        : (data.rollId ? '它正在等你去共同胶卷里看看。' : '今天又多了一个只属于你们的瞬间。'),
      sound: 'default',
      data: { screen: 'Rolls', photoId: data.photoId, rollId: data.rollId || '' },
    },
    trigger: null,
  });
}
