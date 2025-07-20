// import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, TextInput, View } from 'react-native';
import { getCurrentUser } from '../lib/getUser'; // <-- FIXED IMPORT
import { PaymentService } from '../services/payment';


export default function DepositScreen() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const router = useRouter();
  const { confirmPayment } = useStripe();

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const { clientSecret } = await PaymentService.createPaymentIntent(Number(amount), 'INR');
      setClientSecret(clientSecret);

      const user = await getCurrentUser();

      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        setCardError(error.message || 'Payment failed');
        setLoading(false);
        return;
      }
      if (paymentIntent?.status !== 'Succeeded') {
        setCardError('Payment status is not successful');
        setLoading(false);
        return;
      }

      await PaymentService.storeTransaction(user.$id, Number(amount), paymentIntent.id);
      Alert.alert('Success', 'Deposit successful!');
      router.push('/(tabs)/wallet');
    } catch (error: any) {
      Alert.alert('Deposit failed', error?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Deposit Money</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount (INR)"
        keyboardType="numeric"
        style={{ padding: 12, borderWidth: 1, borderRadius: 6, width: 200, marginVertical: 12 }}
      />
      <CardField
        postalCodeEnabled={false}
        style={{ width: 300, height: 50, marginVertical: 20 }}
        onCardChange={
          cardDetails => {
            if (cardDetails.complete) setCardError(null);
          }
        }
      />
      {cardError && <Text style={{ color: 'red' }}>{cardError}</Text>}
      <Button title={loading ? "Processing..." : "Deposit"} onPress={handleDeposit} disabled={loading} />
      {loading && <ActivityIndicator style={{ marginTop: 15 }} />}
    </View>
  );
}