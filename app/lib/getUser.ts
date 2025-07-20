import { supabase } from './supabase';
import type { User } from './types';

// Caution: Adjust 'id' below if your `users` table uses `$id`
export const getCurrentUser = async (): Promise<User> => {
  // 1. Get Supabase auth user (the logged in user)
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('No user found');

  // 2. Fetch app's user profile from 'users' table (must match your fields)
  const { data, error: profileErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id) // or .eq('$id', user.id) if your primary key is $id
    .single();

  if (profileErr || !data) throw profileErr ?? new Error('User profile missing');

  // 3. Map DB fields to your User type
  return {
    $id: data.id,              // If your column is called 'id'
    email: data.email,
    name: data.name,
    phone: data.phone,
    googleId: data.googleId,
    avatar: data.avatar,
    wallet: data.wallet,
    stats: data.stats,
    kyc: data.kyc,
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
};
