import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  KeyboardAvoidingView, 
  Platform, 
  Pressable,
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  View,
  Keyboard
} from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { createVehicle } from '../../services/vehicleService';
import type { VehiclesStackParamList } from '../../navigation/VehiclesNavigator';

type Props = NativeStackScreenProps<VehiclesStackParamList, 'AddVehicle'>;

const vehicleFormSchema = z.object({
  name: z.string().trim().min(1, 'Vehicle name is required'),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  year: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}$/.test(value), 'Year must be 4 digits'),
  vin: z.string().trim().optional(),
  plate: z.string().trim().optional(),
  oilType: z.string().trim().optional(),
  tireSize: z.string().trim().optional(),
  currentMileage: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), 'Mileage must be a number'),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export function AddVehicleScreen({ navigation }: Props) {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: '',
      make: '',
      model: '',
      year: '',
      vin: '',
      plate: '',
      oilType: '',
      tireSize: '',
      currentMileage: '',
    },
  });

  const addVehicleMutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      if (!userId) {
        throw new Error('You must be signed in');
      }

      return createVehicle({
        userId,
        name: values.name,
        make: values.make || undefined,
        model: values.model || undefined,
        year: values.year ? Number(values.year) : undefined,
        vin: values.vin || undefined,
        plate: values.plate || undefined,
        oilType: values.oilType || undefined,
        tireSize: values.tireSize || undefined,
        currentMileage: values.currentMileage ? Number(values.currentMileage) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', userId] });
      navigation.goBack();
    },
  });

  return (
    <ScreenContainer title="Add Vehicle" subtitle="Create a new vehicle profile.">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}
            style={styles.dismissArea}
          >
            <View style={styles.formContainer}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Vehicle name (e.g. Civic)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.name ? <Text style={[styles.error, { color: colors.danger }]}>{errors.name.message}</Text> : null}

        <Controller
          control={control}
          name="make"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Make (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Model (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="year"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Year (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              keyboardType="number-pad"
              onChangeText={onChange}
            />
          )}
        />
        {errors.year ? <Text style={[styles.error, { color: colors.danger }]}>{errors.year.message}</Text> : null}

        <Controller
          control={control}
          name="vin"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="VIN (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="plate"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="License Plate (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="oilType"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Oil type (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="tireSize"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Tire size (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="currentMileage"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Current mileage (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={value}
              keyboardType="number-pad"
              onChangeText={onChange}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
            />
          )}
        />
        {errors.currentMileage ? <Text style={[styles.error, { color: colors.danger }]}>{errors.currentMileage.message}</Text> : null}

        {addVehicleMutation.isError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            {addVehicleMutation.error instanceof Error
              ? addVehicleMutation.error.message
              : 'Unable to add vehicle'}
          </Text>
        ) : null}

        <Button
          title={addVehicleMutation.isPending ? 'Adding...' : 'Add Vehicle'}
          onPress={handleSubmit((values) => addVehicleMutation.mutate(values))}
          disabled={addVehicleMutation.isPending}
          loading={addVehicleMutation.isPending}
        />
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  dismissArea: {
    flex: 1,
  },
  formContainer: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    marginTop: -8,
  },
});
