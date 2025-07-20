import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { useGameState } from '../../hooks/useGameState';
import { databases, getCurrentUser } from '../../lib/appwrite';
import { GameRoom, PlayerKey, User } from '../../lib/types'; // <-- Import GameRoom and PlayerKey

// Load environment variables (requires react-native-dotenv setup)
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const APPWRITE_GAME_STATES_COLLECTION = process.env.APPWRITE_GAME_STATES_COLLECTION || 'YOUR_GAME_STATES_COLLECTION';

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#6B2D26' },
  board: { width: 300, height: 300, position: 'relative' },
  boardImage: { width: 300, height: 300, position: 'absolute' },
  token: { position: 'absolute', width: 20, height: 20 },
  dice: { width: 50, height: 50, margin: 10 },
  moveButton: { backgroundColor: 'red', padding: 10, borderRadius: 5, marginTop: 10 },
  moveText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

const getPlayerColor = (playerNumber: number): string => {
  const colors: Record<number, string> = { 1: 'red', 2: 'green', 3: 'yellow', 4: 'blue' };
  return colors[playerNumber] || 'gray';
};

const getTokenPositionStyle = (position: number): { top: number; left: number } => {
  const gridSize = 300 / 15;
  const row = Math.floor(position / 15);
  const col = position % 15;
  return { top: row * gridSize, left: col * gridSize };
};

export default function PlayScreen() {
  const { id: roomId } = useLocalSearchParams();
  const { gameState, rollDice, moveToken, isLoading } = useGameState(roomId as string);
  const [user, setUser] = useState<User | null>(null);
  const diceValue = useSharedValue(gameState?.diceValue || 1);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Fetch User Error:', error);
        Alert.alert('Error', 'Failed to load user data. Please try again.');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (gameState?.diceValue) {
      diceValue.value = withTiming(gameState.diceValue, { duration: 500 });
    }
  }, [gameState?.diceValue]);

  const handleMove = async (tokenIndex: number) => {
    if (!gameState || !gameState.diceValue) return;
    // --- Use PlayerKey for proper typing ---
    const playerKey = `player${gameState.currentPlayer}` as PlayerKey;
    const token = gameState.gameBoard[playerKey].tokens[tokenIndex];
    const newPosition = token.position + gameState.diceValue;

    // Check move limit
    const moveCount = gameState.moveCounts[playerKey] || 0;
    const moveLimit = gameState.room.gameSettings.moveLimit || 10;
    if (moveCount >= moveLimit) {
      Alert.alert('Move Limit Reached', 'You have reached the maximum number of moves for this game.');
      return;
    }

    try {
      await moveToken(tokenIndex, newPosition);
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_GAME_STATES_COLLECTION,
        roomId as string,
        {
          moveCounts: {
            ...gameState.moveCounts,
            [playerKey]: moveCount + 1,
          },
        }
      );
    } catch (error) {
      console.error('Move Token Error:', error);
      Alert.alert('Error', 'Failed to move token. Please try again.');
    }
  };

  if (isLoading || !gameState) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.moveButton}
        onPress={rollDice}
        disabled={
          gameState.currentPlayer !==
          gameState.players.find((p: GameRoom['players'][0]) => p.userId === user?.$id)?.playerNumber
        }
        accessibilityLabel="Roll dice button"
      >
        <Text style={styles.moveText}>ROLL DICE ({gameState.diceValue || 1})</Text>
      </TouchableOpacity>
      <Text accessibilityLabel={`Moves left for player ${gameState.currentPlayer}`}>
        Moves Left: {gameState.room.gameSettings.moveLimit -
          (gameState.moveCounts[`player${gameState.currentPlayer}` as PlayerKey] || 0)}
      </Text>
      <View style={styles.board}>
        <Image source={require('../../assets/images/ludo_board_chart.png')} style={styles.boardImage} />
        {Object.entries(gameState.gameBoard).map(([playerKey, player]) =>
          player.tokens.map((token, index) => {
            const color = token.color || getPlayerColor(Number(playerKey.replace('player', '')));
            const positionStyle = useSharedValue(getTokenPositionStyle(token.position));
            useEffect(() => {
              positionStyle.value = withTiming(getTokenPositionStyle(token.position), { duration: 300 });
            }, [token.position]);
            return (
              <Animated.View
                key={`${playerKey}-${index}`}
                style={[styles.token, positionStyle.value, { zIndex: 1 }]}
              >
                <TouchableOpacity
                  onPress={() => handleMove(index)}
                  accessibilityLabel={`Move ${color} token ${index + 1}`}
                >
                  <Image
                    source={
                      color === 'red'
                        ? require('../../assets/images/token_red.png')
                        : color === 'green'
                        ? require('../../assets/images/token_green.png')
                        : color === 'yellow'
                        ? require('../../assets/images/token_yellow.png')
                        : color === 'blue'
                        ? require('../../assets/images/token_blue.png')
                        : require('../../assets/images/token_gray.png')
                    }
                    style={{ width: 20, height: 20 }}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </View>
      <Animated.Image
        source={require(`../../assets/images/dice_${Math.round(diceValue.value)}.svg`)}
        style={styles.dice}
        accessibilityLabel="Dice roll"
      />
    </View>
  );
}
