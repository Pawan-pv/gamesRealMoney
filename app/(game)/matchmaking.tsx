import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { databases, getCurrentUser } from '../lib/appwrite';
import { useSocketIO } from '../hooks/useSocketIo';
import { GameRoom, User } from '../lib/types';
import { Query } from 'react-native-appwrite';
import { Alert } from 'react-native';

export default function MatchmakingScreen() {
  const { fee } = useLocalSearchParams(); // fee is a string
  const router = useRouter();
  const { socket, connect } = useSocketIO();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        router.push('/(auth)/login');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user || !fee) return;
    const findOrCreateRoom = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_ROOMS_COLLECTION!,
          [Query.equal('entryFee', parseFloat(fee as string)), Query.equal('status', 'waiting')]
        );
        const rooms = response.documents as unknown as GameRoom[];
        if (rooms.length && rooms[0].currentPlayers < rooms[0].maxPlayers) {
          setRoomId(rooms[0].$id);
          router.push(`/game/room/${rooms[0].$id}`  as any);
        } else {
          const room = await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_ROOMS_COLLECTION,
            'unique()',
            {
              roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
              entryFee: parseFloat(fee as string),
              maxPlayers: 4,
              currentPlayers: 1,
              gameType: 'classic',
              status: 'waiting',
              prizePool: 0,
              commission: 0,
              players: [
                {
                  userId: user.$id,
                  playerNumber: 1,
                  joinedAt: new Date().toISOString(),
                  isReady: false,
                  isBot: false,
                },
              ],
              gameSettings: {
                timeLimit: 600,
                autoPlay: false,
                botsEnabled: true,
                moveLimit: fee === '2' ? 16 : 10,
              },
              createdBy: user.$id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
          setRoomId(room.$id);
          router.push(`/game/room/${room.$id}`  as any);
        }
      } catch (error) {
        console.error('Matchmaking Error:', error);
        Alert.alert('Error', 'Failed to find or create a room. Please try again.');
      }
    };
    findOrCreateRoom();
  }, [fee, user]);

  useEffect(() => {
    if (roomId && socket && user) {
      connect(roomId, user.$id);
      socket.on('roomFull', async (data: { roomId: string }) => {
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_ROOMS_COLLECTION,
          data.roomId,
          { status: 'playing' }
        );
        router.push(`/play/${data.roomId}`);
      });
    }
    return () => {
      if (socket) socket.off('roomFull');
    };
  }, [roomId, socket, user]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Waiting for players...</Text>
    </View>
  );
}