// App.tsx
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { LetterScreen } from './src/screens/LetterScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BottomTabBar } from './src/components/BottomTabBar';
import { Letter, listenLetters } from './src/services/letters';
import {
  addNotificationResponseListener,
  ensureMessageNotificationPermission,
  readLastNotificationResponse,
  setupNotificationHandler,
  showIncomingMessageNotification,
} from './src/services/notifications';

setupNotificationHandler();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function navigateFromNotification(data: any, attempt = 0) {
  if (data?.screen !== 'Letter') return;
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate('Main', { screen: 'Letter' });
    return;
  }
  if (attempt < 20) {
    setTimeout(() => navigateFromNotification(data, attempt + 1), 250);
  }
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Album" component={AlbumScreen} />
      <Tab.Screen name="Letter" component={LetterScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { userId, loading } = useAuth();

  return (
    <NavigationContainer ref={navigationRef}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userId ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

function messageNotificationBody(letter: Letter): string {
  if (letter.type === 'image') return '发来了一张图片';
  const text = (letter.content || '发来了一条消息').replace(/\s+/g, ' ').trim();
  return text.length > 60 ? `${text.slice(0, 59)}…` : text;
}

function LocalMessageNotificationBridge() {
  const { userId, coupleId, partner } = useAuth();
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    ensureMessageNotificationPermission().catch(e => console.warn('[notify] permission failed', e));

    readLastNotificationResponse(navigateFromNotification)
      .catch(e => console.warn('[notify] read last response failed', e));

    return addNotificationResponseListener(navigateFromNotification);
  }, []);

  useEffect(() => {
    initializedRef.current = false;
    seenIdsRef.current = new Set();

    if (!userId || !coupleId) return;
    const listenerStartedAt = Date.now();
    const unsubscribe = listenLetters(coupleId, (letters) => {
      const unseenIncoming = letters.filter(letter => (
        letter.from !== userId && !seenIdsRef.current.has(letter.id)
      ));

      letters.forEach(letter => seenIdsRef.current.add(letter.id));

      if (!initializedRef.current) {
        initializedRef.current = true;
        return;
      }

      const currentRoute = navigationRef.isReady()
        ? navigationRef.getCurrentRoute()?.name
        : '';
      const isReadingLetters = AppState.currentState === 'active' && currentRoute === 'Letter';
      if (isReadingLetters) return;

      unseenIncoming
        .filter(letter => letter.createdAt >= listenerStartedAt - 2000)
        .forEach(letter => {
          showIncomingMessageNotification({
            title: `${partner?.nickname || 'TA'} 发来一封情书`,
            body: messageNotificationBody(letter),
            messageId: letter.id,
            coupleId,
          }).catch(e => console.warn('[notify] show message failed', e));
        });
    });

    return unsubscribe;
  }, [userId, coupleId, partner?.nickname]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocalMessageNotificationBridge />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
