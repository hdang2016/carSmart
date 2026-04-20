import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ThemeHeaderToggle } from '../components/ThemeHeaderToggle';
import { VehiclesScreen } from '../screens/main/VehiclesScreen';
import { AddVehicleScreen } from '../screens/vehicles/AddVehicleScreen';
import { EditVehicleScreen } from '../screens/vehicles/EditVehicleScreen';
import { VehicleDetailScreen } from '../screens/vehicles/VehicleDetailScreen';

export type VehiclesStackParamList = {
  VehicleList: undefined;
  AddVehicle: undefined;
  EditVehicle: {
    vehicleId: string;
  };
  VehicleDetail: {
    vehicleId: string;
  };
};

const Stack = createNativeStackNavigator<VehiclesStackParamList>();

export function VehiclesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <ThemeHeaderToggle />,
      }}
    >
      <Stack.Screen
        name="VehicleList"
        component={VehiclesScreen}
        options={{ title: 'My Garage' }}
      />
      <Stack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={{ title: 'Vehicle Detail' }}
      />
      <Stack.Screen
        name="AddVehicle"
        component={AddVehicleScreen}
        options={{ title: 'Add Vehicle' }}
      />
      <Stack.Screen
        name="EditVehicle"
        component={EditVehicleScreen}
        options={{ title: 'Edit Vehicle' }}
      />
    </Stack.Navigator>
  );
}
