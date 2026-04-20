import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceNavigator';
import { createMaintenanceRecord } from '../../services/maintenanceService';
import { listVehiclesByUser } from '../../services/vehicleService';
import { MAINTENANCE_TYPES, type MaintenanceType } from '../../types/maintenance';
import { formatMaintenanceType } from '../../utils/maintenance';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'AddMaintenance'>;

const addMaintenanceSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Select a vehicle'),
  type: z.enum(MAINTENANCE_TYPES),
  date: z
    .string()
    .trim()
    .min(1, 'Date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Use YYYY-MM-DD date format'),
  mileage: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), 'Mileage must be a number'),
  cost: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), 'Cost must be a number'),
  notes: z.string().trim().optional(),
});

type AddMaintenanceValues = z.infer<typeof addMaintenanceSchema>;

export function AddMaintenanceScreen({ navigation }: Props) {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMaintenanceValues>({
    resolver: zodResolver(addMaintenanceSchema),
    defaultValues: {
      vehicleId: '',
      type: 'oil_change',
      date: new Date().toISOString().slice(0, 10),
      mileage: '',
      cost: '',
      notes: '',
    },
  });

  const selectedType = watch('type');
  const selectedVehicleId = watch('vehicleId');

  // Generate dates for specific month/year
  const getMonthDates = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    
    const dates: (Date | null)[] = [];
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      dates.push(null);
    }
    // Add actual dates
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    return dates;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const goToPreviousMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear(pickerYear - 1);
    } else {
      setPickerMonth(pickerMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear(pickerYear + 1);
    } else {
      setPickerMonth(pickerMonth + 1);
    }
  };

  const resetToToday = () => {
    const today = new Date();
    setPickerMonth(today.getMonth());
    setPickerYear(today.getFullYear());
  };

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      return listVehiclesByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: async (values: AddMaintenanceValues) => {
      if (!userId) {
        throw new Error('You must be signed in');
      }

      return createMaintenanceRecord({
        userId,
        vehicleId: values.vehicleId,
        type: values.type,
        date: new Date(values.date + 'T00:00:00'),
        mileage: values.mileage ? Number(values.mileage) : undefined,
        cost: values.cost ? Number(values.cost) : undefined,
        notes: values.notes || undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['maintenance', userId] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles', userId] }),
      ]);
      navigation.goBack();
    },
  });

  const onSubmit = (values: AddMaintenanceValues) => {
    addMaintenanceMutation.mutate(values);
  };

  return (
    <ScreenContainer
      title="Log Maintenance"
      subtitle="Create a maintenance record and sync vehicle mileage if higher."
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <Pressable
          onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}
          style={styles.dismissArea}
        >
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>VEHICLE</Text>
          {vehiclesQuery.isLoading ? (
            <Text style={{ color: colors.text }}>Loading vehicles...</Text>
          ) : vehiclesQuery.isError ? (
            <Text style={[styles.errorMessage, { color: colors.danger }]}>
              {vehiclesQuery.error instanceof Error
                ? vehiclesQuery.error.message
                : 'Unable to load vehicles'}
            </Text>
          ) : vehiclesQuery.data && vehiclesQuery.data.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No vehicles yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Add a vehicle first</Text>
            </View>
          ) : (
            <FlatList
              data={vehiclesQuery.data}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id ?? item.name}
              contentContainerStyle={styles.chipList}
              renderItem={({ item }) => {
                const isSelected = selectedVehicleId === item.id;
                const vehicleLabel = [item.make, item.model].filter(Boolean).join(' ') || item.name;

                return (
                  <Pressable
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      if (item.id) {
                        setValue('vehicleId', item.id, { shouldValidate: true });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isSelected ? colors.textInverse : colors.text },
                        isSelected && styles.chipLabelSelected,
                      ]}
                    >
                      {vehicleLabel}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
          {errors.vehicleId ? (
            <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.vehicleId.message}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>SERVICE TYPE</Text>
          <FlatList
            data={MAINTENANCE_TYPES as readonly MaintenanceType[]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.chipList}
            renderItem={({ item }) => {
              const isSelected = selectedType === item;

              return (
                <Pressable
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setValue('type', item, { shouldValidate: true })}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: isSelected ? colors.textInverse : colors.text },
                      isSelected && styles.chipLabelSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {formatMaintenanceType(item)}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>DETAILS</Text>
          <View style={styles.formGroup}>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <>
                  <Pressable
                    style={styles.inputWrapper}
                    onPress={() => {
                      // Set picker to selected date's month or current month
                      if (value) {
                        const selectedDate = new Date(value + 'T00:00:00');
                        setPickerMonth(selectedDate.getMonth());
                        setPickerYear(selectedDate.getFullYear());
                      } else {
                        const today = new Date();
                        setPickerMonth(today.getMonth());
                        setPickerYear(today.getFullYear());
                      }
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={[styles.inputIcon, { color: colors.textMuted }]}>📅</Text>
                    <View
                      style={[
                        styles.input,
                        styles.dateInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: errors.date ? colors.danger : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.dateText, { color: value ? colors.text : colors.textMuted }]}>
                        {value ? formatDisplayDate(value) : 'Select date'}
                      </Text>
                    </View>
                  </Pressable>

                  <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <Pressable 
                      style={styles.modalOverlay}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <View 
                        style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}
                        onStartShouldSetResponder={() => true}
                      >
                        <View style={styles.datePickerHeader}>
                          <Pressable 
                            style={[styles.monthNavButton, { backgroundColor: colors.surfaceMuted }]}
                            onPress={goToPreviousMonth}
                          >
                            <Text style={[styles.monthNavText, { color: colors.text }]}>←</Text>
                          </Pressable>
                          
                          <View style={styles.monthYearContainer}>
                            <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                              {new Date(pickerYear, pickerMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>
                            <Pressable onPress={resetToToday}>
                              <Text style={[styles.todayButton, { color: colors.primary }]}>Today</Text>
                            </Pressable>
                          </View>
                          
                          <Pressable 
                            style={[styles.monthNavButton, { backgroundColor: colors.surfaceMuted }]}
                            onPress={goToNextMonth}
                          >
                            <Text style={[styles.monthNavText, { color: colors.text }]}>→</Text>
                          </Pressable>
                        </View>

                        <View style={styles.weekdayHeader}>
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                            <Text key={idx} style={[styles.weekdayText, { color: colors.textMuted }]}>
                              {day}
                            </Text>
                          ))}
                        </View>

                        <View style={styles.dateGrid}>
                          {getMonthDates(pickerYear, pickerMonth).map((date, index) => {
                            if (!date) {
                              return <View key={`empty-${index}`} style={styles.dateCell} />;
                            }
                            
                            const dateString = date.toISOString().slice(0, 10);
                            const isSelected = value === dateString;
                            const isToday = dateString === new Date().toISOString().slice(0, 10);
                            
                            return (
                              <Pressable
                                key={dateString}
                                style={[
                                  styles.dateCell,
                                  {
                                    backgroundColor: isSelected 
                                      ? colors.primary 
                                      : isToday 
                                      ? colors.surfaceMuted 
                                      : 'transparent',
                                    borderColor: isToday && !isSelected ? colors.primary : colors.border,
                                  },
                                ]}
                                onPress={() => {
                                  onChange(dateString);
                                  setShowDatePicker(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dateCellDay,
                                    {
                                      color: isSelected 
                                        ? colors.textInverse 
                                        : isToday 
                                        ? colors.primary 
                                        : colors.text,
                                      fontWeight: isSelected || isToday ? '700' : '500',
                                    },
                                  ]}
                                >
                                  {date.getDate()}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Pressable
                          style={[styles.closeDatePicker, { backgroundColor: colors.surfaceMuted }]}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={[styles.closeDatePickerText, { color: colors.text }]}>Close</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Modal>
                </>
              )}
            />
            {errors.date ? (
              <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.date.message}</Text>
            ) : null}

            <Controller
              control={control}
              name="mileage"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputIcon, { color: colors.textMuted }]}>📍</Text>
                  <TextInput
                    placeholder="Mileage (optional)"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.mileage ? colors.danger : colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={value}
                    keyboardType="number-pad"
                    onChangeText={onChange}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              )}
            />
            {errors.mileage ? (
              <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.mileage.message}</Text>
            ) : null}

            <Controller
              control={control}
              name="cost"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputIcon, { color: colors.textMuted }]}>💵</Text>
                  <TextInput
                    placeholder="Cost (optional)"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.cost ? colors.danger : colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={value}
                    keyboardType="decimal-pad"
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
            {errors.cost ? (
              <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.cost.message}</Text>
            ) : null}

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputIcon, styles.notesIcon, { color: colors.textMuted }]}>💬</Text>
                  <TextInput
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      styles.notesInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              )}
            />
          </View>
        </View>

        {addMaintenanceMutation.isError ? (
          <Text style={[styles.errorMessage, { color: colors.danger }]}>
            {addMaintenanceMutation.error instanceof Error
              ? addMaintenanceMutation.error.message
              : 'Unable to save maintenance record'}
          </Text>
        ) : null}

        <View style={styles.submitSection}>
          <Button
            title={addMaintenanceMutation.isPending ? 'Saving...' : 'Save Maintenance'}
            onPress={handleSubmit(onSubmit)}
            disabled={addMaintenanceMutation.isPending}
            loading={addMaintenanceMutation.isPending}
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipList: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipLabelSelected: {
    fontWeight: '700',
  },
  formGroup: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inputIcon: {
    fontSize: 20,
    marginTop: 12,
  },
  notesIcon: {
    marginTop: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  errorMessage: {
    fontSize: 13,
    marginTop: -8,
    marginLeft: 4,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  submitSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavText: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthYearContainer: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  todayButton: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: '13%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dateCell: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateCellDay: {
    fontSize: 16,
  },
  closeDatePicker: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeDatePickerText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
