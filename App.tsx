import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { CoupleCodeScreen } from './src/screens/auth/CoupleCodeScreen';
import { colors } from './src/theme';

// Placeholder for main app (replaced in Task 5)
function MainApp() {
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

const Stack = createStackNavigator();

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
            <Stack.Screen name="Main" component={MainApp} />
          ) : (
            <>
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
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
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
