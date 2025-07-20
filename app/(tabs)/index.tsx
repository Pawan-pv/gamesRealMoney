// app/(tabs)/index.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCurrentUser } from '../lib/appwrite';
import { User } from '../lib/types';
import { useGame } from '../context/GameContext';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  profile: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  gameCard: { padding: 10, borderWidth: 1, borderRadius: 5, marginBottom: 10 },
});

interface GameCardProps {
  title: string;
  route?: string;
  isPlaceholder?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ title, route, isPlaceholder }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.gameCard, { opacity: isPlaceholder ? 0.5 : 1 }]}
      onPress={route ? () => router.push(route as any) : undefined}
      disabled={isPlaceholder}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { user, setUser } = useGame();
  const router = useRouter();

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

  const trendingGames = [{ id: '1', title: 'Coming Soon', isPlaceholder: true }];
  const forYouGames = [{ id: '2', title: 'Coming Soon', isPlaceholder: true }];
  const popularGames = [{ id: 'ludo', title: 'Ludo', route: '/(game)/create' }];

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <Image
          source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
          accessibilityLabel="User avatar"
        />
        <Text accessibilityLabel="User name">{user?.name || 'Guest'}</Text>
      </View>
      <Text style={styles.sectionTitle}>Wallet Balance: ₹{user?.wallet.balance || 0}</Text>
      <Text style={styles.sectionTitle}>Trending Games 🔥</Text>
      <FlatList
        data={trendingGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GameCard title={item.title} isPlaceholder={item.isPlaceholder} />}
      />
      <Text style={styles.sectionTitle}>For You 🎯</Text>
      <FlatList
        data={forYouGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GameCard title={item.title} isPlaceholder={item.isPlaceholder} />}
      />
      <Text style={styles.sectionTitle}>Popular Games ⭐</Text>
      <FlatList
        data={popularGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GameCard title={item.title} route={item.route} />}
      />
    </View>
  );
}