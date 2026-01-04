import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { wsService } from '../services/WebSocketService';
import { CabinRoomData } from '../types/cabin';

interface CabinLobbyScreenProps {
  onRoleAssigned: (role: 'leader' | 'participant', data: CabinRoomData) => void;
  onError: (error: { code: string; message: string }) => void;
}

export const CabinLobbyScreen: React.FC<CabinLobbyScreenProps> = ({
  onRoleAssigned,
  onError,
}) => {
  const {
    cabineId,
    bluetoothDeviceName,
    isMockMode,
    setCabinRole,
    setPlayersInCabin,
    setCabinStatus,
    setTeam,
  } = useGame();

  const [status, setStatus] = useState<'connecting' | 'waiting' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Animação de pulso
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Conectar à cabine
    if (isMockMode) {
      handleMockConnection();
    } else {
      handleRealConnection();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMockConnection = () => {
    console.log('[CabinLobby] Usando modo MOCK');
    setStatus('waiting');

    // Simular delay de conexão
    setTimeout(() => {
      // 50% chance de ser líder, 50% participante
      const isLeader = Math.random() > 0.5;

      if (isLeader) {
        console.log('[CabinLobby] Mock: Você é o LÍDER');
        const mockData: CabinRoomData = {
          cabinId: cabineId!,
          role: 'leader',
          cabinStatus: 'empty',
          playersInRoom: [
            {
              id: 1,
              nickname: 'Você (Mock)',
              isLeader: true,
            },
          ],
          bluetoothDeviceName: bluetoothDeviceName || undefined,
        };

        setCabinRole('leader');
        setPlayersInCabin(mockData.playersInRoom);
        setCabinStatus('empty');

        onRoleAssigned('leader', mockData);
      } else {
        console.log('[CabinLobby] Mock: Você é PARTICIPANTE');
        const mockData: CabinRoomData = {
          cabinId: cabineId!,
          role: 'participant',
          cabinStatus: 'active',
          teamId: 1,
          teamName: 'Time Mock',
          leaderId: 1,
          leaderNickname: 'Líder Mock',
          playersInRoom: [
            {
              id: 1,
              nickname: 'Líder Mock',
              isLeader: true,
            },
            {
              id: 2,
              nickname: 'Você (Mock)',
              isLeader: false,
            },
          ],
          bluetoothDeviceName: bluetoothDeviceName || undefined,
        };

        setCabinRole('participant');
        setPlayersInCabin(mockData.playersInRoom);
        setCabinStatus('active');
        setTeam({ id: 1, nome: 'Time Mock' });

        onRoleAssigned('participant', mockData);
      }
    }, 2000); // 2 segundos de "loading"
  };

  const handleRealConnection = async () => {
    console.log('[CabinLobby] Conectando ao WebSocket /ws/cabin');
    
    if (!cabineId) {
      handleError({
        code: 'INVALID_CABIN_ID',
        message: 'ID da cabine não encontrado. Escaneie o QR Code novamente.',
      });
      return;
    }

    try {
      // Timeout de 15 segundos
      timeoutRef.current = setTimeout(() => {
        handleError({
          code: 'WEBSOCKET_TIMEOUT',
          message: 'Timeout ao conectar ao servidor. Verifique sua conexão.',
        });
      }, 15000);

      setStatus('connecting');

      // Conectar ao WebSocket de cabines
      await wsService.connect('cabin');

      console.log('[CabinLobby] WebSocket conectado');
      setStatus('waiting');

      // Listener para resposta de joinCabinRoom
      const unsubscribe = wsService.onMessage('cabinRoomJoined', (response) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        console.log('[CabinLobby] Resposta recebida:', response);

        if (response.success === false) {
          handleError({
            code: response.error || 'SERVER_ERROR',
            message: response.message || 'Erro ao entrar na sala da cabine',
          });
          return;
        }

        if (!response.data) {
          handleError({
            code: 'SERVER_ERROR',
            message: 'Resposta inválida do servidor',
          });
          return;
        }

        const data = response.data as CabinRoomData;

        // Salvar dados no contexto
        setCabinRole(data.role);
        setPlayersInCabin(data.playersInRoom);
        setCabinStatus(data.cabinStatus);

        if (data.role === 'participant' && data.teamId && data.teamName) {
          setTeam({ id: data.teamId, nome: data.teamName });
        }

        console.log(`[CabinLobby] Role atribuído: ${data.role}`);
        onRoleAssigned(data.role!, data);

        unsubscribe();
      });

      // Enviar mensagem joinCabinRoom
      wsService.send({
        action: 'joinCabinRoom',
        data: { cabineId },
      });

    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      console.error('[CabinLobby] Erro ao conectar:', error);
      handleError({
        code: 'WEBSOCKET_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao conectar ao servidor',
      });
    }
  };

  const handleError = (error: { code: string; message: string }) => {
    console.error('[CabinLobby] Erro:', error);
    setStatus('error');
    setErrorMessage(error.message);
    onError(error);
  };

  const handleRetry = () => {
    setStatus('connecting');
    setErrorMessage('');
    
    if (isMockMode) {
      handleMockConnection();
    } else {
      handleRealConnection();
    }
  };

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Erro de Conexão</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.icon}>🏠</Text>
        </Animated.View>

        <Text style={styles.title}>
          {status === 'connecting' ? 'Conectando...' : 'Verificando Sala...'}
        </Text>

        <Text style={styles.subtitle}>
          Cabine #{cabineId}
        </Text>

        {bluetoothDeviceName && (
          <Text style={styles.bluetooth}>
            📶 {bluetoothDeviceName}
          </Text>
        )}

        {isMockMode && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>🧪 MODO MOCK</Text>
          </View>
        )}

        <ActivityIndicator
          size="large"
          color="#3b82f6"
          style={styles.spinner}
        />

        <Text style={styles.hint}>
          {status === 'connecting'
            ? 'Conectando ao servidor...'
            : 'Determinando sua função...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  bluetooth: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  mockBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  mockBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  spinner: {
    marginVertical: 32,
  },
  hint: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

