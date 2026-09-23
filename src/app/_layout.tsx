import React from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashGate } from '../components/SplashGate';
import { SPLASH_FADE_MS } from '../constants/splash';
import { AuthProvider } from '../hooks/AuthProvider';
import { ConversationProvider } from '../hooks/ConversationProvider';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: SPLASH_FADE_MS });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SplashGate />
        <ConversationProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: {
                backgroundColor: theme.background,
              },
              headerTintColor: theme.text,
              headerTitleStyle: {
                fontWeight: '600',
              },
              contentStyle: {
                backgroundColor: theme.background,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="+not-found"
              options={{
                title: 'Página no encontrada',
              }}
            />
          </Stack>
        </ConversationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
