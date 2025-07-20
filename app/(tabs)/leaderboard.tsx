// app/(tabs)/leaderboard.tsx
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { databases } from '../lib/appwrite';
import { LeaderboardEntry } from '../lib/types';
import { Query } from 'react-native-appwrite';


export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_LEADERBOARD_COLLECTION!,
          [Query.orderDesc('totalWinnings')]
        );
        setLeaderboard((response.documents as unknown) as LeaderboardEntry[]);
      } catch (error) {
        console.error('Fetch Leaderboard Error:', error);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text>Leaderboard (Weekly)</Text>
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.$id}
        renderItem={({ item, index }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{index + 1}. {item.username} - ₹{item.totalWinnings}</Text>
            <Text>Win Rate: {item.winRate}%</Text>
          </View>
        )}
      />
    </View>
  );
}