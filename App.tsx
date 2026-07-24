import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { IdentityScreen } from './src/screens/IdentityScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { RollsScreen } from './src/screens/RollsScreen';
import { RollDetailScreen } from './src/screens/RollDetailScreen';
import { UsScreen } from './src/screens/UsScreen';
import { BottomTabBar } from './src/components/BottomTabBar';
import {
  addNotificationResponseListener,
  readLastNotificationResponse,
  setupNotificationHandler,
} from './src/services/notifications';
import {
  startPhotoBackgroundSync,
  stopPhotoBackgroundSync,
} from './src/services/backgroundPhotoSync';
import { colors } from './src/theme';

setupNotificationHandler();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function navigateFromNotification(data: any, attempt = 0) {
  if (data?.screen !== 'Rolls') return;
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate('Main', { screen: 'Rolls' });
    return;
  }
  if (attempt < 20) setTimeout(() => navigateFromNotification(data, attempt + 1), 250);
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={props => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Rolls" component={RollsScreen} />
      <Tab.Screen name="Us" component={UsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { userId, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.rose} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
        {userId ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="RollDetail" component={RollDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Identity" component={IdentityScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function PhotoBackgroundSyncBridge() {
  const { userId, coupleId, partner } = useAuth();

  useEffect(() => {
    readLastNotificationResponse(navigateFromNotification).catch(() => {});
    return addNotificationResponseListener(navigateFromNotification);
  }, []);

  useEffect(() => {
    if (!userId || !coupleId) {
      stopPhotoBackgroundSync().catch(() => {});
      return;
    }
    startPhotoBackgroundSync({
      userId,
      coupleId,
      partnerName: partner?.nickname || 'TA',
    }).catch(() => false);
  }, [userId, coupleId, partner?.nickname]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PhotoBackgroundSyncBridge />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
