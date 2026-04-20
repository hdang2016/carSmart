import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../contexts/AuthContext';
import { authSchema } from '../../schemas/auth';
import type { AuthFormValues } from '../../types/auth';
import type { AuthStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const { signIn, firebaseConfigError } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  register('email');
  register('password');

  const onSubmit = async (values: AuthFormValues) => {
    try {
      setSubmitError(null);
      await signIn(values.email, values.password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      setSubmitError(message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={styles.input}
        onChangeText={(value) => setValue('email', value, { shouldValidate: true })}
      />
      {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

      <TextInput
        secureTextEntry
        placeholder="Password"
        style={styles.input}
        onChangeText={(value) => setValue('password', value, { shouldValidate: true })}
      />
      {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      {firebaseConfigError ? <Text style={styles.error}>{firebaseConfigError}</Text> : null}

      <Button
        title={isSubmitting ? 'Signing in...' : 'Sign In'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />

      <View style={styles.footer}>
        <Text>New here?</Text>
        <Button title="Create account" onPress={() => navigation.navigate('SignUp')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#b91c1c',
  },
  footer: {
    marginTop: 8,
    gap: 8,
  },
});
