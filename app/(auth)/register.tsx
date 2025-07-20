import { useRouter } from 'expo-router';
import { Alert, Button, Text, View } from 'react-native';
import { loginWithGoogle } from '../lib/auth'; // Make sure path is correct

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = async () => {
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
