// app/(game)/create.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { calculatePrizePool } from '../constants/fees';
import { useGame } from '../context/GameContext';
import { databases, getCurrentUser } from '../lib/appwrite';

// Load environment variables (requires react-native-dotenv setup in babel.config.js)
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const APPWRITE_ROOMS_COLLECTION = process.env.APPWRITE_ROOMS_COLLECTION || 'YOUR_ROOMS_COLLECTION';
const APPWRITE_GAME_STATES_COLLECTION = process.env.APPWRITE_GAME_STATES_COLLECTION || 'YOUR_GAME_STATES_COLLECTION';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  tierCard: { padding: 10, borderWidth: 1, borderRadius: 5, marginBottom: 10, width: '100%' },
  tierText: { fontSize: 16, marginBottom: 5 },
});

export default function CreateRoomScreen() {
  const { user, setUser, setEntryFee } = useGame();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Extended entry fees (aligned with fees.ts)
  const EXTENDED_FEES = {
    micro: 2,
    beginner: 5,
    amateur: 10,
    pro: 25,
    expert: 50,
    master: 100,
    elite: 250,
    legend: 500,
    champion: 1000,
    ultimate: 5000,
  } as const;

  // Move limits per tier
  const moveLimits: Record<keyof typeof EXTENDED_FEES, number> = {
    micro: 16,
    beginner: 16,
    amateur: 10,
    pro: 10,
    expert: 10,
    master: 10,
    elite: 10,
    legend: 10,
    champion: 10,
    ultimate: 10,
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Fetch User Error:', error);
        Alert.alert('Error', 'Failed to load user data. Please try logging in again.');
        router.push('/(auth)/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [setUser, router]);

  const handleSelectTier = async (tier: keyof typeof EXTENDED_FEES) => {
    if (!user) {
      Alert.alert('Error', 'User not loaded. Please try again.');
      return;
    }

    setEntryFee(tier); // Set the entry fee in context

    if (user.wallet?.balance === undefined || user.wallet.balance < EXTENDED_FEES[tier]) {
      Alert.alert('Insufficient Balance', 'Please add funds to your wallet to proceed.');
      router.push('/(payment)/deposit');
      return;
    }

    setLoading(true);
    try {
      const room = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_ROOMS_COLLECTION,
        'unique()',
        {
          roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          entryFee: EXTENDED_FEES[tier],
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
            autoPlay: false, // Fixed typo: was 'autoPlay lotn'
            botsEnabled: true,
            moveLimit: moveLimits[tier],
          },
          createdBy: user.$id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_GAME_STATES_COLLECTION,
        'unique()',
        {
          roomId: room.$id,
          currentPlayer: 1,
          diceValue: 0,
          moveCounts: { player1: 0, player2: 0, player3: 0, player4: 0 },
          gameBoard: {
            player1: { tokens: Array(4).fill({ position: 0, isHome: true, isSafe: false, color: 'red' }) },
            player2: { tokens: Array(4).fill({ position: 0, isHome: true, isSafe: false, color: 'green' }) },
            player3: { tokens: Array(4).fill({ position: 0, isHome: true, isSafe: false, color: 'yellow' }) },
            player4: { tokens: Array(4).fill({ position: 0, isHome: true, isSafe: false, color: 'blue' }) },
          },
          gameHistory: [],
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      // Use object-based navigation for query parameters
      router.push({
        pathname: '/(game)/matchmaking',
        params: { fee: EXTENDED_FEES[tier].toString() },
      });
    } catch (error) {
      console.error('Create Room Error:', error);
      Alert.alert('Error', 'Failed to create game room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }} accessibilityLabel="Ludo Game Setup">
        Ludo Game Setup
      </Text>
      {loading && <Text>Loading...</Text>}
      {!loading &&
        Object.entries(EXTENDED_FEES).map(([tier, fee]) => {
          const { winnerAmount, runnerUpAmount } = calculatePrizePool(fee, 4);
          return (
            <View key={tier} style={styles.tierCard}>
              <Text
                style={styles.tierText}
                accessibilityLabel={`Entry fee ${fee} rupees, ${moveLimits[tier as keyof typeof EXTENDED_FEES]} moves`}
              >
                Entry: ₹{fee} - {moveLimits[tier as keyof typeof EXTENDED_FEES]} Moves
              </Text>
              <Text
                style={styles.tierText}
                accessibilityLabel={`Winner prize ${winnerAmount} rupees, Runner-up prize ${runnerUpAmount} rupees`}
              >
                Winner: ₹{winnerAmount}, Runner-up: ₹{runnerUpAmount}
              </Text>
              <Button
                title={(user?.wallet?.balance ?? 0) >= fee ? 'Continue' : 'Add Cash & Play'}
                onPress={() => handleSelectTier(tier as keyof typeof EXTENDED_FEES)}
                disabled={loading}
                accessibilityLabel={
                  user?.wallet?.balance ?? 0 >= fee
                    ? `Continue with ${fee} rupees entry`
                    : `Add cash to play with ${fee} rupees entry`
                }
              />
            </View>
          );
        })}
    </View>
  );
}