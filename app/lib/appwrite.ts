import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Account, Client, Databases } from 'react-native-appwrite';

const client = new Client()
  .setEndpoint('YOUR_APPWRITE_ENDPOINT')
  .setProject('YOUR_APPWRITE_PROJECT_ID');

export const account = new Account(client);
export const databases = new Databases(client);

export const loginWithGoogle = async (): Promise<{ type: string; url?: string }> => {
  try {
    const redirectUrl = Linking.createURL('/auth/callback');
    const authUrl = client.config.endpoint +
      '/v1/account/sessions/oauth2/google' +
      `?project=${client.config.project}` +
      `&success=${encodeURIComponent(redirectUrl)}` +
      `&failure=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
      showInRecents: true,
    });

    // There is not always a need to call handleRedirect for Appwrite.
    if (result.type === 'success') {
      return { type: 'success' };
    } else if (result.type === 'cancel') {
      return { type: 'cancel' };
    } else if (result.type === 'dismiss') {
      return { type: 'dismiss' };
    }
    return { type: 'unknown' };
  } catch (error) {
    console.error('Google Auth Error:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<any> => {
  try {
    const user = await account.get();
    // Adjust the following based on your schema:
    const userDoc = await databases.getDocument(
      'YOUR_DATABASE_ID',
      'YOUR_USERS_COLLECTION',
      user.$id
    );
    return userDoc;
  } catch (error) {
    console.error('Get User Error:', error);
    throw error;
  }
};
