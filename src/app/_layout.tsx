import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../hooks/AuthProvider';
import { ConversationProvider } from '../hooks/ConversationProvider';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors } from '../theme/colors';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  return (
    <SafeAreaProvider>
      <AuthProvider>
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
