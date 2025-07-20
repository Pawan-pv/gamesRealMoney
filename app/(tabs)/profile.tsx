import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getCurrentUser } from '../lib/getUser'; // <-- fixed line!
import { User } from '../lib/types';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Fetch User Error:', error);
      }
    };
    fetchUser();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile</Text>
      <Text>Name: {user?.name || 'N/A'}</Text>
      <Text>Email: {user?.email || 'N/A'}</Text>
      <Text>Games Played: {user?.stats.gamesPlayed || 0}</Text>
    </View>
  );
}
