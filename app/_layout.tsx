// app/_layout.tsx
import { Stack } from 'expo-router';
// import { useEffect } from 'react';
import { GameProvider } from './context/GameContext';
// import { PaymentService } from './services/payment';

export default function RootLayout() {
//   useEffect(() => {
//     PaymentService.initializeStripe();
//   }, []);

  return (
    <GameProvider>
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(game)" options={{ headerShown: false }} />
      <Stack.Screen name="(payment)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
    </Stack>
    </GameProvider>
  );

}
