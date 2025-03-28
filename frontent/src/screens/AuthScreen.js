import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Auth } from 'aws-amplify';

const AuthScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    try {
      const user = await Auth.signIn(email, password);
      console.log('User signed in successfully:', user);
      navigation.navigate('ReferralList'); // Navigate to referral list screen after login
    } catch (error) {
      console.error('Error signing in:', error);
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
    }
  };

  const handleRegister = async () => {
    try {
      const newUser = await Auth.signUp({
        username: email,
        password,
        attributes: { email }, // Add any additional attributes as needed
      });
      console.log('User registered successfully:', newUser);
      Alert.alert('Registration Successful', 'Please verify your email before logging in.');
      setIsRegistering(false);
    } catch (error) {
      console.error('Error registering:', error);
      Alert.alert('Registration Failed', 'An error occurred during registration.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isRegistering ? 'Register' : 'Login'}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title={isRegistering ? 'Register' : 'Login'}
        onPress={isRegistering ? handleRegister : handleLogin}
      />

      <Button
        title={isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        onPress={() => setIsRegistering(!isRegistering)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
  },
});

export default AuthScreen;