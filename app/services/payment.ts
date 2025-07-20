// import { initStripe } from '@stripe/stripe-react-native';
// import { supabase } from '../lib/supabase';
// import { Transaction } from '../lib/types';

// export const PaymentService = {
//   initializeStripe: async () => {
//     try {
//       await initStripe({
//         publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY',
//       });
//     } catch (error) {
//       console.error('Stripe Initialization Error:', error);
//       throw error;
//     }
//   },

//   createPaymentIntent: async (amount: number, currency: string = 'INR'): Promise<{ clientSecret: string }> => {
//     try {
//       const response = await fetch(`${process.env.SERVER_URL || 'http://localhost:3000'}/api/create-payment-intent`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ amount, currency }),
//       });
//       if (!response.ok) {
//         throw new Error('Failed to create payment intent');
//       }
//       return await response.json();
//     } catch (error) {
//       console.error('Payment Intent Error:', error);
//       throw error;
//     }
//   },

//   storeTransaction: async (
//     userId: string,
//     amount: number,
//     paymentIntentId: string,
//     gameRoomId?: string
//   ): Promise<Transaction> => {
//     try {
//       const transaction: Transaction = {
//         $id: '',
//         userId,
//         type: gameRoomId ? 'game_entry' : 'deposit',
//         amount,
//         currency: 'INR',
//         status: 'completed',
//         paymentMethod: 'stripe',
//         stripePaymentId: paymentIntentId,
//         gameRoomId,
//         description: gameRoomId ? `Entry fee for game room ${gameRoomId}` : 'Wallet deposit',
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//       };

//       const { data, error } = await supabase
//         .from('transactions')
//         .insert(transaction)
//         .select()
//         .single();
//       if (error) throw error;

//       return data as Transaction;
//     } catch (error) {
//       console.error('Store Transaction Error:', error);
//       throw error;
//     }
//   },
// };