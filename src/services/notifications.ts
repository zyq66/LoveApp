import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

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

interface IncomingMessageNotification {
  title: string;
  body: string;
  messageId: string;
  coupleId: string;
}

export async function ensureMessageNotificationPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: '消息',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4ade80',
      sound: 'default',
    });
  }

  const currentPerm = await Notifications.getPermissionsAsync();
  let status = currentPerm.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  return status === 'granted';
}

export async function readLastNotificationResponse(
  onData: (data: any) => void,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const response = await Notifications.getLastNotificationResponseAsync();
  onData(response?.notification.request.content.data as any);
}

export function addNotificationResponseListener(
  onData: (data: any) => void,
): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onData(response.notification.request.content.data as any);
  });
  return () => sub.remove();
}

export async function showIncomingMessageNotification(
  data: IncomingMessageNotification,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const granted = await ensureMessageNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: data.title,
      body: data.body,
      sound: 'default',
      data: {
        screen: 'Letter',
        coupleId: data.coupleId,
        messageId: data.messageId,
      },
    },
    trigger: null,
  });
}
