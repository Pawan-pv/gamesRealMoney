import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { getCurrentUser } from '../lib/getUser';
import { supabase } from '../lib/supabase'; // <-- FIXED: import supabase!
import { Transaction } from '../lib/types';

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser.$id);
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('userId', currentUser.$id);
        if (error) throw error;
        setTransactions(data as Transaction[]);
      } catch (error) {
        console.error('Fetch Transactions Error:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text>Transaction History</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>Type: {item.type}</Text>
            <Text>Amount: ₹{item.amount}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Date: {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
