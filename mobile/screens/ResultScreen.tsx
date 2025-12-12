import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { wsService } from '../services/WebSocketService';
import { bluetoothService } from '../services/BluetoothService';
import { useGame } from '../context/GameContext';

interface ResultScreenProps {
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  onPlayAgain,
  onBackToLobby,
}) => {
  const { partidaId, score, gameResult, setGameState, team } = useGame();
  const [disarming, setDisarming] = useState(false);
  const finalizarListenerRef = useRef<(() => void) | null>(null);

  // Log para debug
  useEffect(() => {
    console.log('[ResultScreen] GameResult:', gameResult);
    console.log('[ResultScreen] Score:', score);
    console.log('[ResultScreen] PartidaId:', partidaId);
  }, [gameResult, score, partidaId]);

  // Limpar listener ao desmontar
  useEffect(() => {
    return () => {
      if (finalizarListenerRef.current) {
        finalizarListenerRef.current();
        finalizarListenerRef.current = null;
      }
    };
  }, []);

  const handleDisarm = async () => {
    if (!partidaId) {
      Alert.alert('Erro', 'ID da partida não disponível');
      return;
    }

    setDisarming(true);
    
    // Remover listener anterior se existir
    if (finalizarListenerRef.current) {
      finalizarListenerRef.current();
      finalizarListenerRef.current = null;
    }

    try {
      // 1. Bluetooth DESARMAR
      await bluetoothService.sendCommand('DESARMAR');

      // 2. Listener para resposta de finalizarPartida
      finalizarListenerRef.current = wsService.onMessage('*', (response) => {
        console.log('[ResultScreen] Mensagem recebida:', JSON.stringify(response, null, 2));
        
        // Ignorar mensagem de conexão
        if (response.action === 'connected') {
          return;
        }

        // Verificar se é resposta de finalizarPartida
        if (response.action === 'finalizarPartida') {
          console.log('[ResultScreen] Resposta de finalizarPartida recebida:', {
            success: response.success,
            error: response.error,
          });

          // Limpar listener
          if (finalizarListenerRef.current) {
            finalizarListenerRef.current();
            finalizarListenerRef.current = null;
          }

          if (response.success === true) {
            console.log('[ResultScreen] ✅ Partida finalizada com sucesso!');
            setGameState('finished');
            setDisarming(false);
            // Navegar para PlayAgain após um pequeno delay
            setTimeout(() => {
              onPlayAgain();
            }, 500);
          } else if (response.error) {
            console.error('[ResultScreen] ❌ Erro ao finalizar partida:', response.error);
            // Mesmo com erro, navegar para PlayAgain (o desarme já foi feito)
            setGameState('finished');
            setDisarming(false);
            setTimeout(() => {
              onPlayAgain();
            }, 500);
          }
        }
      });

      // 3. WS finalizarPartida
      const finalizarMessage = {
        action: 'finalizarPartida' as const,
        data: {
          id: partidaId,
          result: gameResult === 'success',
        },
      };
      
      console.log('[ResultScreen] Finalizando partida:', JSON.stringify(finalizarMessage, null, 2));
      console.log('[ResultScreen] Detalhes:', {
        partidaId,
        result: gameResult === 'success',
        score,
        timeId: team?.id,
        timeNome: team?.nome,
      });

      wsService.send(finalizarMessage);

      // Timeout de segurança (se não receber resposta em 5 segundos, navegar mesmo assim)
      setTimeout(() => {
        if (finalizarListenerRef.current) {
          console.log('[ResultScreen] Timeout ao finalizar partida, navegando mesmo assim...');
          if (finalizarListenerRef.current) {
            finalizarListenerRef.current();
            finalizarListenerRef.current = null;
          }
          setGameState('finished');
          setDisarming(false);
          onPlayAgain();
        }
      }, 5000);

    } catch (error) {
      console.error('[ResultScreen] Erro ao desarmar:', error);
      if (finalizarListenerRef.current) {
        finalizarListenerRef.current();
        finalizarListenerRef.current = null;
      }
      Alert.alert('Erro', `Falha ao desarmar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setDisarming(false);
    }
  };

  // Determinar se é sucesso baseado no gameResult do contexto
  const isSuccess = gameResult === 'success';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultado</Text>

      <View style={[styles.resultCard, isSuccess ? styles.successCard : styles.failCard]}>
        <Text style={styles.resultIcon}>{isSuccess ? '✓' : '✗'}</Text>
        <Text style={styles.resultText}>
          {isSuccess ? 'Sucesso!' : 'Falha!'}
        </Text>
      </View>

      <View style={styles.scoreSection}>
        <Text style={styles.scoreLabel}>Pontuação Acumulada</Text>
        <Text style={styles.scoreValue}>{score}</Text>
      </View>

      {isSuccess && (
        <Pressable
          style={[styles.button, disarming && styles.buttonDisabled]}
          onPress={handleDisarm}
          disabled={disarming}
        >
          {disarming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Desarmar Bomba</Text>
          )}
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={onPlayAgain}>
          <Text style={styles.secondaryButtonText}>Jogar Novamente</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onBackToLobby}>
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
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  resultCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  successCard: {
    backgroundColor: '#10b981',
  },
  failCard: {
    backgroundColor: '#ef4444',
  },
  resultIcon: {
    fontSize: 64,
    color: '#fff',
    marginBottom: 8,
  },
  resultText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  scoreSection: {
    backgroundColor: '#111827',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
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

