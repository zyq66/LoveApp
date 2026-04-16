// App.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { CoupleCodeScreen } from './src/screens/auth/CoupleCodeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { LetterScreen } from './src/screens/LetterScreen';
import { MomentsScreen } from './src/screens/MomentsScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { BottomTabBar } from './src/components/BottomTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Album" component={AlbumScreen} />
      <Tab.Screen name="Letter" component={LetterScreen} />
      <Tab.Screen name="Moments" component={MomentsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { userId, loading } = useAuth();

  return (
    <NavigationContainer>
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
              <Stack.Screen name="CoupleCode" component={CoupleCodeScreen} />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
