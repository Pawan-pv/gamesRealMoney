import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import { supabase } from '../lib/supabase'; // fixed import
import { GameRoom } from '../lib/types';

export default function GamesScreen() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'waiting');
        if (error) throw error;
        setRooms(data as GameRoom[]);
      } catch (error) {
        console.error('Fetch Rooms Error:', error);
      }
    };
    fetchRooms();
  }, []);

  const joinRoom = (roomId: string) => {
    router.push(`/game/room/${roomId}` as any);
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text>Available Games</Text>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.$id} // fixed
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>Room: {item.roomCode}</Text>
            <Text>Entry Fee: ₹{item.entryFee}</Text>
            <Text>Players: {item.currentPlayers}/{item.maxPlayers}</Text>
            <Button title="Join" onPress={() => joinRoom(item.$id)} /> {/* fixed */}
          </View>
        )}
      />
    </View>
  );
}
