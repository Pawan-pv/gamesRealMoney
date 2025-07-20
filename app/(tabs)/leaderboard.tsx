import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { LeaderboardEntry } from '../lib/types';

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*')
          .order('totalWinnings', { ascending: false });
        if (error) throw error;
        setLeaderboard(data as LeaderboardEntry[]);
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