import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSocketIO } from '../hooks/useSocketIo';
import { getCurrentUser } from '../lib/getUser';
import { supabase } from '../lib/supabase';
import { GameRoom, User } from '../lib/types';

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
        // Find waiting room with this fee
        const { data: rooms, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('entryFee', parseFloat(fee as string))
          .eq('status', 'waiting');
        if (error) throw error;

        const foundRoom = rooms?.length ? rooms[0] as GameRoom : null;

        if (foundRoom && foundRoom.currentPlayers < foundRoom.maxPlayers) {
          setRoomId(foundRoom.$id);
          router.push(`/game/room/${foundRoom.$id}` as any);
        } else {
          // Create a new room
          const { data: room, error: createError } = await supabase
            .from('rooms')
            .insert({
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
            })
            .select()
            .single();
          if (createError) throw createError;
          setRoomId(room.$id);
          router.push(`/game/room/${room.$id}` as any);
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
        await supabase
          .from('rooms')
          .update({ status: 'playing' })
          .eq('$id', data.roomId); // using $id as key
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
