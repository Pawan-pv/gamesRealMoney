import { useRouter } from 'expo-router';
import { Alert, Button, Text, View } from 'react-native';
import { loginWithGoogle } from '../lib/appwrite';

export default function RegisterScreen() {
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const result = await loginWithGoogle();
      switch (result.type) {
        case 'success':
          router.push('/(tabs)');
          break;
        case 'cancel':
          Alert.alert('Registration Cancelled', 'You cancelled the Google registration process.');
          break;
        case 'dismiss':
          Alert.alert('Registration Dismissed', 'The browser window was closed. Please try again.');
          break;
        default:
          Alert.alert('Registration Error', 'An unexpected error occurred. Please try again later.');
      }
    } catch (error) {
      console.error('Register Error:', error);
      Alert.alert('Registration Failed', 'An error occurred during registration. Please check your connection and try again.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ marginBottom: 10, fontSize: 16 }}>
        Don't have an account? Click below to register with Google.
      </Text>
      <Button title="Register with Google" onPress={handleRegister} />
    </View>
  );
}