import { View, Text, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { loginWithGoogle } from '../lib/appwrite';
import * as WebBrowser from 'expo-web-browser';

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const result = await loginWithGoogle();
      switch (result.type) {
        case 'success':
          router.push('/(tabs)');
          break;
        case 'cancel':
          Alert.alert('Login Cancelled', 'You cancelled the Google login process.');
          break;
        case 'dismiss':
          Alert.alert('Login Dismissed', 'The browser window was closed. Please try again.');
          break;
        default:
          Alert.alert('Login Error', 'An unexpected error occurred. Please try again later.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('Login Failed', 'An error occurred during login. Please check your connection and try again.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ marginBottom: 10, fontSize: 16 }}>
        Already have an account? Click below to log in with Google.
      </Text>
      <Button title="Login with Google" onPress={handleLogin} />
    </View>
  );
}