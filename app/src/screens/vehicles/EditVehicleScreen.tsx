import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
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
import { useAppTheme } from '../../contexts/ThemeContext';
import { getVehicleById, updateVehicle } from '../../services/vehicleService';
import type { VehiclesStackParamList } from '../../navigation/VehiclesNavigator';

type Props = NativeStackScreenProps<VehiclesStackParamList, 'EditVehicle'>;

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

export function EditVehicleScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const { vehicleId } = route.params;

  const {
    control,
    handleSubmit,
    reset,
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

  const vehicleQuery = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => getVehicleById(vehicleId),
  });

  useEffect(() => {
    if (!vehicleQuery.data) {
      return;
    }

    reset({
      name: vehicleQuery.data.name,
      make: vehicleQuery.data.make ?? '',
      model: vehicleQuery.data.model ?? '',
      year: vehicleQuery.data.year ? String(vehicleQuery.data.year) : '',
      vin: vehicleQuery.data.vin ?? '',
      plate: vehicleQuery.data.plate ?? '',
      oilType: vehicleQuery.data.oilType ?? '',
      tireSize: vehicleQuery.data.tireSize ?? '',
      currentMileage: vehicleQuery.data.currentMileage
        ? String(vehicleQuery.data.currentMileage)
        : '',
    });
  }, [reset, vehicleQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      return updateVehicle(vehicleId, {
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      ]);
      navigation.goBack();
    },
  });

  if (vehicleQuery.isLoading) {
    return (
      <ScreenContainer title="Edit Vehicle" subtitle="Update vehicle details.">
        <Text style={{ color: colors.text }}>Loading vehicle...</Text>
      </ScreenContainer>
    );
  }

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <ScreenContainer title="Edit Vehicle" subtitle="Update vehicle details.">
        <Text style={[styles.error, { color: colors.danger }]}>
          {vehicleQuery.error instanceof Error
            ? vehicleQuery.error.message
            : 'Unable to load vehicle'}
        </Text>
      </ScreenContainer>
    );
  }

  const vehicle = vehicleQuery.data;

  return (
    <ScreenContainer title="Edit Vehicle" subtitle={`Updating ${vehicle.name}`}>
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
                    placeholder="Vehicle name"
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

        {updateMutation.isError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : 'Unable to update vehicle'}
          </Text>
        ) : null}

        <Button
          title={updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          onPress={handleSubmit((values) => updateMutation.mutate(values))}
          disabled={updateMutation.isPending}
          loading={updateMutation.isPending}
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
