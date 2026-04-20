import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ThemeHeaderToggle } from '../components/ThemeHeaderToggle';
import { AddMaintenanceScreen } from '../screens/maintenance/AddMaintenanceScreen';
import { EditMaintenanceScreen } from '../screens/maintenance/EditMaintenanceScreen';
import { MaintenanceDetailScreen } from '../screens/maintenance/MaintenanceDetailScreen';
import { MaintenanceListScreen } from '../screens/maintenance/MaintenanceListScreen';
import { MaintenanceSettingsScreen } from '../screens/maintenance/MaintenanceSettingsScreen';

export type MaintenanceStackParamList = {
  MaintenanceList: undefined;
  AddMaintenance: undefined;
  MaintenanceDetail: {
    maintenanceId: string;
  };
  EditMaintenance: {
    maintenanceId: string;
  };
  MaintenanceSettings: undefined;
};

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

export function MaintenanceNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <ThemeHeaderToggle />,
      }}
    >
      <Stack.Screen
        name="MaintenanceList"
        component={MaintenanceListScreen}
        options={{ title: 'Maintenance' }}
      />
      <Stack.Screen
        name="AddMaintenance"
        component={AddMaintenanceScreen}
        options={{ title: 'Log Maintenance' }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{ title: 'Maintenance Detail' }}
      />
      <Stack.Screen
        name="EditMaintenance"
        component={EditMaintenanceScreen}
        options={{ title: 'Edit Maintenance' }}
      />
      <Stack.Screen
        name="MaintenanceSettings"
        component={MaintenanceSettingsScreen}
        options={{ title: 'Service Intervals' }}
      />
    </Stack.Navigator>
  );
}
