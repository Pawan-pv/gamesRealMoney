// app/(payment)/history.tsx
import { View, Text, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { Transaction } from '../lib/types';
import { getCurrentUser } from '../lib/appwrite';
import { Query } from 'react-native-appwrite';


export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser.$id);
        const response = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_TRANSACTIONS_COLLECTION!,
          [Query.equal('userId', currentUser.$id)]
        );
        setTransactions((response.documents as unknown) as Transaction[]);
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