import { initStripe } from '@stripe/stripe-react-native';
import { databases } from '../lib/appwrite';
import { Transaction } from '../lib/types';

// Load environment variables (requires react-native-dotenv setup)
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const APPWRITE_TRANSACTIONS_COLLECTION = process.env.APPWRITE_TRANSACTIONS_COLLECTION || 'YOUR_TRANSACTIONS_COLLECTION';

export const PaymentService = {
  initializeStripe: async () => {
    try {
      await initStripe({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY',
      });
    } catch (error) {
      console.error('Stripe Initialization Error:', error);
      throw error;
    }
  },

  createPaymentIntent: async (amount: number, currency: string = 'INR'): Promise<{ clientSecret: string }> => {
    try {
      const response = await fetch(`${process.env.SERVER_URL || 'http://localhost:3000'}/api/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      return await response.json();
    } catch (error) {
      console.error('Payment Intent Error:', error);
      throw error;
    }
  },

  storeTransaction: async (
    userId: string,
    amount: number,
    paymentIntentId: string,
    gameRoomId?: string
  ): Promise<Transaction> => {
    try {
      const transaction: Transaction = {
        $id: '',
        userId,
        type: gameRoomId ? 'game_entry' : 'deposit',
        amount,
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'stripe',
        stripePaymentId: paymentIntentId,
        gameRoomId,
        description: gameRoomId ? `Entry fee for game room ${gameRoomId}` : 'Wallet deposit',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_TRANSACTIONS_COLLECTION,
        'unique()',
        transaction
      );

      return ((response.documet as  unknown)) as Transaction;
    } catch (error) {
      console.error('Store Transaction Error:', error);
      throw error;
    }
  },
};