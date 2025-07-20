import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, Text, View } from 'react-native';
import { useSocketIO } from '../../hooks/useSocketIo';
import { getCurrentUser } from '../../lib/getUser';
import { supabase } from '../../lib/supabase';
import { GameRoom, User } from '../../lib/types';

export default function GameRoomScreen() {
  const { id: roomId } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const { socket, connect } = useSocketIO();

  // 1. Fetch user once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch user');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 2. Fetch room whenever roomId changes
  useEffect(() => {
    if (!roomId) return;
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('$id', roomId) // Use '$id' if that's your PK. Use 'id' if not!
          .single();
        if (error) throw error;
        if (mounted) setRoom(data as GameRoom);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch room');
      }
    })();
    return () => { mounted = false; };
  }, [roomId]);

  // 3. Kick off socket connect when both user and socket are ready
  useEffect(() => {
    if (roomId && user && socket) {
      connect(roomId as string, user.$id);
    }
  }, [roomId, user, socket]);

  const joinRoom = async () => {
    if (user && room && !room.players.find((p) => p.userId === user.$id)) {
      const newPlayers = [
        ...room.players,
        {
          userId: user.$id,
          playerNumber: room.currentPlayers + 1,
          joinedAt: new Date().toISOString(),
          isReady: false,
          isBot: false,
        },
      ];
      try {
        const { error } = await supabase
          .from('rooms')
          .update({
            currentPlayers: room.currentPlayers + 1,
            players: newPlayers,
          })
          .eq('$id', roomId); // Use '$id' if that's your PK in your table!
        if (error) throw error;
        setRoom({
          ...room,
          currentPlayers: room.currentPlayers + 1,
          players: newPlayers,
        });
        if (socket) socket.emit('joinRoom', roomId, user.$id);
      } catch (err) {
        Alert.alert('Error', 'Failed to join room');
      }
    }
  };

  // Handler to start the game or redirect to play page
  const handlePlay = () => {
    if (roomId) {
      router.push(`/play/${roomId}`);
    }
  };

  // Loading states
  if (!room) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading room...</Text>
      </View>
    );
  }

  // Determine if the current user is in this room
  const hasJoined = !!room.players.find((p) => p.userId === user?.$id);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 8 }}>Room: {room.roomCode}</Text>
      <Text>Entry Fee: ₹{room.entryFee}</Text>
      <Text>Players: {room.currentPlayers}/{room.maxPlayers}</Text>
      <Text>Status: {room.status}</Text>
      <View style={{ height: 16 }} />
      {!hasJoined && (
        <Button title="Join Room" onPress={joinRoom} />
      )}
      {hasJoined && (
        <Button title="Play" onPress={handlePlay} />
      )}
      <View style={{ marginTop: 32, alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Players:</Text>
        {room.players.map((p, idx) => (
          <Text key={p.userId} style={{ color: p.isBot ? 'grey' : 'black' }}>
            {idx + 1}. {p.userId} {p.isBot ? '(bot)' : ''} {p.isReady ? '✅' : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
