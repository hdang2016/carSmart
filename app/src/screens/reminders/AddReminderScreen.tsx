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
import { createReminder } from '../../services/reminderService';
import { listVehiclesByUser } from '../../services/vehicleService';
import { MAINTENANCE_TYPES, type MaintenanceType } from '../../types/maintenance';
import { formatMaintenanceType } from '../../utils/maintenance';

type Props = NativeStackScreenProps<any, 'AddReminder'>;

const addReminderSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Select a vehicle'),
  type: z.enum(MAINTENANCE_TYPES),
  dueDate: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      'Use YYYY-MM-DD date format',
    ),
  dueMileage: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), 'Mileage must be a number'),
  message: z.string().trim().min(1, 'Message is required'),
}).refine((data) => data.dueDate || data.dueMileage, {
  message: 'Either due date or due mileage is required',
  path: ['dueDate'],
});

type AddReminderValues = z.infer<typeof addReminderSchema>;

export function AddReminderScreen({ navigation, route }: Props) {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const preselectedVehicleId = route.params?.vehicleId;

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<AddReminderValues>({
    resolver: zodResolver(addReminderSchema),
    defaultValues: {
      vehicleId: preselectedVehicleId || '',
      type: 'oil_change',
      dueDate: '',
      dueMileage: '',
      message: '',
    },
  });

  const selectedType = watch('type');
  const selectedVehicleId = watch('vehicleId');
  const selectedDate = watch('dueDate');

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      return listVehiclesByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const addReminderMutation = useMutation({
    mutationFn: async (values: AddReminderValues) => {
      if (!userId) throw new Error('Not authenticated');

      return createReminder({
        userId,
        vehicleId: values.vehicleId,
        type: values.type,
        dueDate: values.dueDate ? new Date(values.dueDate + 'T00:00:00') : undefined,
        dueMileage: values.dueMileage ? Number(values.dueMileage) : undefined,
        message: values.message,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
      navigation.goBack();
    },
  });

  // Date picker navigation helpers
  const getMonthDates = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const dates: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      dates.push(null);
    }
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
      year: 'numeric',
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

  return (
    <ScreenContainer title="Add Reminder" subtitle="Set up a maintenance reminder">
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
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyText, { color: colors.text }]}>No vehicles found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Add a vehicle first to create reminders
              </Text>
            </View>
          ) : (
            <FlatList
              data={vehiclesQuery.data}
              horizontal
              keyExtractor={(item) => item.id ?? item.name}
              contentContainerStyle={styles.chipList}
              renderItem={({ item }) => {
                const isSelected = selectedVehicleId === item.id;

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
                      numberOfLines={1}
                    >
                      {`${item.make} ${item.model} ${item.year}`}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
          {errors.vehicleId ? (
            <Text style={[styles.errorMessage, { color: colors.danger }]}>
              {errors.vehicleId.message}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>SERVICE TYPE</Text>
          <FlatList
            data={MAINTENANCE_TYPES as readonly MaintenanceType[]}
            horizontal
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
          <Text style={[styles.label, { color: colors.textMuted }]}>REMINDER DETAILS</Text>
          <View style={styles.formGroup}>
            <Controller
              control={control}
              name="dueDate"
              render={({ field: { onChange, value } }) => (
                <>
                  <Pressable
                    style={styles.inputWrapper}
                    onPress={() => {
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
                          borderColor: errors.dueDate ? colors.danger : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.dateText, { color: value ? colors.text : colors.textMuted }]}>
                        {value ? formatDisplayDate(value) : 'Due date (optional)'}
                      </Text>
                    </View>
                  </Pressable>

                  <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
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
                              {new Date(pickerYear, pickerMonth).toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                              })}
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
                                    borderColor:
                                      isToday && !isSelected ? colors.primary : 'transparent',
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
                          <Text style={[styles.closeDatePickerText, { color: colors.text }]}>
                            Close
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Modal>
                </>
              )}
            />
            {errors.dueDate ? (
              <Text style={[styles.errorMessage, { color: colors.danger }]}>
                {errors.dueDate.message}
              </Text>
            ) : null}

            <Controller
              control={control}
              name="dueMileage"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputIcon, { color: colors.textMuted }]}>📍</Text>
                  <TextInput
                    placeholder="Due mileage (optional)"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.dueMileage ? colors.danger : colors.border,
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
            {errors.dueMileage ? (
              <Text style={[styles.errorMessage, { color: colors.danger }]}>
                {errors.dueMileage.message}
              </Text>
            ) : null}

            <Controller
              control={control}
              name="message"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputIcon, styles.notesIcon, { color: colors.textMuted }]}>
                    💬
                  </Text>
                  <TextInput
                    placeholder="Reminder message"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      styles.notesInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.message ? colors.danger : colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                </View>
              )}
            />
            {errors.message ? (
              <Text style={[styles.errorMessage, { color: colors.danger }]}>
                {errors.message.message}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.submitSection}>
          {addReminderMutation.isError ? (
            <Text style={[styles.errorMessage, { color: colors.danger }]}>
              {addReminderMutation.error instanceof Error
                ? addReminderMutation.error.message
                : 'Unable to create reminder'}
            </Text>
          ) : null}

          <Button
            title={addReminderMutation.isPending ? 'Creating...' : 'Create Reminder'}
            onPress={handleSubmit((values) => addReminderMutation.mutate(values))}
            disabled={addReminderMutation.isPending}
            loading={addReminderMutation.isPending}
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
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  notesInput: {
    minHeight: 100,
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
