import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useAppTheme } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  initializeReminderNotifications,
  resyncReminderNotifications,
} from './src/services/notificationService';
import { listActiveRemindersByUser } from './src/services/reminderService';

const queryClient = new QueryClient();

function AppShell() {
  const { navigationTheme, resolvedTheme } = useAppTheme();
  const { userId, isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const syncNotifications = async () => {
      await initializeReminderNotifications();

      if (!isAuthenticated || !userId) {
        return;
      }

      const reminders = await listActiveRemindersByUser(userId);
      if (!cancelled) {
        await resyncReminderNotifications(reminders);
      }
    };

    syncNotifications().catch((error) => {
      console.warn('Unable to sync reminder notifications on startup', error);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
