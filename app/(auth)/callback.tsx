// app/auth/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Handle the redirect (optional validation)
    router.replace('/(tabs)');
  }, []);

  return null; // This screen doesn't render UI
}