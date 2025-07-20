// app/(tabs)/games.tsx
import { View, Text, FlatList, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { GameRoom } from '../lib/types';
import { Query } from 'react-native-appwrite';


export default function GamesScreen() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_ROOMS_COLLECTION!,
          [Query.equal('status', 'waiting')]
        );
        setRooms((response.documents as unknown) as GameRoom[]);
      } catch (error) {
        console.error('Fetch Rooms Error:', error);
      }
    };
    fetchRooms();
  }, []);

  const joinRoom = (roomId: string) => {
    router.push(`/game/room/${roomId}` as  any);
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text>Available Games</Text>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>Room: {item.roomCode}</Text>
            <Text>Entry Fee: ₹{item.entryFee}</Text>
            <Text>Players: {item.currentPlayers}/{item.maxPlayers}</Text>
            <Button title="Join" onPress={() => joinRoom(item.$id)} />
          </View>
        )}
      />
    </View>
  );
}