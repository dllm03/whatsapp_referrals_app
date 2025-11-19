// frontend/screens/ConfirmRegistrationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const ConfirmRegistrationScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const { confirmRegistration, resendCode } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleConfirm = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await confirmRegistration(email, code);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Email verified successfully! You can now login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const response = await resendCode(email);
      
      if (response.success) {
        Alert.alert('Success', 'Verification code sent to your email');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Verification Code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading && !resending}
        />

        <TouchableOpacity
          style={[styles.button, (loading || resending) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={loading || resending}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleResendCode}
          disabled={loading || resending}
        >
          {resending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.linkText}>Didn't receive code? Resend</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, { marginTop: 16 }]}
          onPress={() => navigation.navigate('Login')}
          disabled={loading || resending}
        >
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  email: {
    fontWeight: '600',
    color: '#007AFF',
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default ConfirmRegistrationScreen;