// app/+not-found.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Page Not Found</Text>
      <Text onPress={() => router.push('/(tabs)')}>Go Home</Text>
    </View>
  );
}