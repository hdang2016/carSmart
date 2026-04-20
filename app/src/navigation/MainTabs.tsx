import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { ThemeHeaderToggle } from '../components/ThemeHeaderToggle';
import type { MainTabParamList } from '../types/navigation';
import { useAppTheme } from '../contexts/ThemeContext';
import { CalendarScreen } from '../screens/main/CalendarScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { MaintenanceNavigator } from './MaintenanceNavigator';
import { VehiclesNavigator } from './VehiclesNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerRight: () => <ThemeHeaderToggle />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused }) => {
          let icon = '✨';

          if (route.name === 'HomeTab') {
            icon = '🏠';
          } else if (route.name === 'VehiclesTab') {
            icon = '🚗';
          } else if (route.name === 'MaintenanceTab') {
            icon = '🛠️';
          } else if (route.name === 'CalendarTab') {
            icon = '📅';
          } else if (route.name === 'ProfileTab') {
            icon = '👤';
          }

          return <Text style={{ fontSize: focused ? 20 : 18 }}>{icon}</Text>;
        },
        tabBarStyle: {
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen
        name="VehiclesTab"
        component={VehiclesNavigator}
        options={{ title: 'My Garage', headerShown: false }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={MaintenanceNavigator}
        options={{ title: 'Maintenance', headerShown: false }}
      />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
