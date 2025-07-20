import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Make sure to call this *once* at the root of your app
WebBrowser.maybeCompleteAuthSession();

export async function loginWithGoogle(): Promise<{ type: string }> {
  try {
    const redirectUrl = Linking.createURL('/auth/callback');
    // See: https://supabase.com/docs/guides/auth/auth-expo
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    // If user completed sign in in browser and returned via deep link:
    if (result.type === 'success' || result.type === 'opened') {
      // Supabase automatically handles session with AsyncStorage after redirect
      return { type: 'success' };
    } else if (result.type === 'cancel') {
      return { type: 'cancel' };
    } else if (result.type === 'dismiss') {
      return { type: 'dismiss' };
    }
    return { type: 'unknown' };
  } catch (error) {
    console.error('Google Auth Error:', error);
    return { type: 'error' };
  }
}
