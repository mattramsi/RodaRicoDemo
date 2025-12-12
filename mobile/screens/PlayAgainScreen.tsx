import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { bluetoothService } from '../services/BluetoothService';
import { useGame } from '../context/GameContext';

interface PlayAgainScreenProps {
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const PlayAgainScreen: React.FC<PlayAgainScreenProps> = ({
  onPlayAgain,
  onBackToLobby,
}) => {
  const { resetGame } = useGame();
  const [loading, setLoading] = useState(false);

  const handlePlayAgain = async () => {
    setLoading(true);
    try {
      // Enviar REINICIAR via Bluetooth
      await bluetoothService.sendCommand('REINICIAR');

      // Reset game state
      resetGame();

      setLoading(false);
      onPlayAgain();
    } catch (error) {
      console.error('Failed to send REINICIAR:', error);
      // Continue anyway
      resetGame();
      setLoading(false);
      onPlayAgain();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jogar Novamente</Text>

      <View style={styles.options}>
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePlayAgain}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Jogar Novamente</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={onBackToLobby}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Voltar ao Lobby</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
    paddingTop: 64,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 48,
    textAlign: 'center',
  },
  options: {
    gap: 16,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

