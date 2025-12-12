import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { wsService } from '../services/WebSocketService';
import { bluetoothService } from '../services/BluetoothService';
import { QuestionService } from '../services/QuestionService';
import { useGame } from '../context/GameContext';

interface LobbyScreenProps {
  onStartGame: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onStartGame }) => {
  const { team, players, setPlayers, setPartidaId, setCabineId, setQuestions, setGameState } = useGame();
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [cabineIdInput, setCabineIdInput] = useState('');

  useEffect(() => {
    // Verificar se já está conectado (pode estar conectado ao WebSocket de times)
    setWsConnected(wsService.isConnected());
    
    const unsubscribe = wsService.onConnectionChange((connected) => {
      setWsConnected(connected);
    });

    // Se tem time mas não tem players, buscar informações do time
    const loadTeamInfo = async () => {
      if (team && team.id && players.length === 0) {
        try {
          // Conectar ao WebSocket de times se não estiver conectado
          if (!wsService.isConnected()) {
            await wsService.connect('time');
          }

          // Usar getTime para buscar informações completas do time
          const getTimeMessage = {
            action: 'getTime' as const,
            data: { id: team.id },
          };

          console.log('[Lobby] Buscando informações do time:', JSON.stringify(getTimeMessage, null, 2));
          
          // Listener temporário para resposta de getTime
          const unsubscribeGetTime = wsService.onMessage('*', (response) => {
            if (response.action === 'getTime' && response.success === true && response.data) {
              const teamData = response.data;
              console.log('[Lobby] Informações do time recebidas:', teamData);
              
              if (teamData.participantes && Array.isArray(teamData.participantes)) {
                setPlayers(teamData.participantes);
              }
              
              unsubscribeGetTime();
            }
          });

          wsService.send(getTimeMessage);

          // Timeout para limpar listener
          setTimeout(() => {
            unsubscribeGetTime();
          }, 5000);
        } catch (error) {
          console.error('[Lobby] Erro ao buscar informações do time:', error);
        }
      }
    };

    loadTeamInfo();

    return () => {
      unsubscribe();
    };
  }, [team, players.length, setPlayers]);

  const handleStartGame = async () => {
    if (!team) {
      Alert.alert('Erro', 'Você precisa estar em um time');
      return;
    }

    if (!cabineIdInput.trim()) {
      Alert.alert('Erro', 'Digite o ID da cabine');
      return;
    }

    const cabineIdNum = parseInt(cabineIdInput.trim());
    if (isNaN(cabineIdNum)) {
      Alert.alert('Erro', 'ID da cabine deve ser um número válido');
      return;
    }

    if (!bluetoothService.isConnected() && !bluetoothService.isMockModeEnabled()) {
      Alert.alert('Erro', 'Conecte-se a uma cabine primeiro');
      return;
    }

    setLoading(true);
    
    let timeoutId: NodeJS.Timeout | null = null;
    let unsubscribeGeneric: (() => void) | null = null;
    
    try {
      // 1. Conectar WS Partida
      if (wsService.isConnected()) {
        wsService.disconnect();
      }
      await wsService.connect('partida');

      // 2. Listener para resposta de iniciarPartida
      unsubscribeGeneric = wsService.onMessage('*', async (response) => {
        console.log('[Lobby] Mensagem recebida:', JSON.stringify(response, null, 2));
        
        // Ignorar mensagem de conexão
        if (response.action === 'connected') {
          console.log('[Lobby] Ignorando mensagem de conexão');
          return;
        }

        // Verificar resposta de iniciarPartida
        if (response.action === 'iniciarPartida' && response.success === true && response.data) {
          const data = response.data;
          console.log('[Lobby] ✅ Resposta de iniciarPartida recebida:', data);
          
          const partidaIdFromWS = data.partidaId;
          const codigo = data.codigo;
          
          if (!partidaIdFromWS) {
            console.error('[Lobby] Resposta não contém partidaId:', JSON.stringify(data, null, 2));
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            if (unsubscribeGeneric) {
              unsubscribeGeneric();
              unsubscribeGeneric = null;
            }
            setLoading(false);
            Alert.alert('Erro', 'Partida iniciada mas sem ID retornado');
            return;
          }

          // Limpar timeout e listener
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (unsubscribeGeneric) {
            unsubscribeGeneric();
            unsubscribeGeneric = null;
          }

          console.log('[Lobby] ✅ Partida iniciada via WebSocket! ID:', partidaIdFromWS, 'Código:', codigo);
          
          setPartidaId(partidaIdFromWS);
          setCabineId(cabineIdNum);

          // 3. Enviar Bluetooth INICIAR
          try {
            await bluetoothService.sendCommand('INICIAR');
          } catch (error) {
            console.error('Failed to send INICIAR:', error);
          }

          // 4. Buscar perguntas via HTTP (única exceção permitida)
          const questions = await QuestionService.getRandomQuestions(5);
          console.log('[Lobby] Perguntas carregadas:', questions.length);
          
          if (!questions || questions.length === 0) {
            console.error('[Lobby] Nenhuma pergunta foi carregada');
            setLoading(false);
            Alert.alert('Erro', 'Falha ao carregar perguntas. Tente novamente.');
            return;
          }
          
          setQuestions(questions);
          setGameState('armed');

          // 5. Navegar para Quiz (com pequeno delay para garantir que o state foi atualizado)
          setLoading(false);
          setTimeout(() => {
            console.log('[Lobby] Navegando para Quiz...');
            onStartGame();
          }, 100);
        }

        // Verificar erros
        if (response.action === 'iniciarPartida' && (response.error || response.success === false)) {
          console.error('[Lobby] Erro ao iniciar partida:', response.error || response.message);
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (unsubscribeGeneric) {
            unsubscribeGeneric();
            unsubscribeGeneric = null;
          }
          setLoading(false);
          Alert.alert('Erro', response.error || response.message || 'Falha ao iniciar partida');
        }
      });

      // Timeout de segurança
      timeoutId = setTimeout(() => {
        if (unsubscribeGeneric) {
          unsubscribeGeneric();
          unsubscribeGeneric = null;
        }
        setLoading(false);
        Alert.alert('Timeout', 'Não recebemos resposta do servidor. Tente novamente.');
      }, 15000);

      // Enviar iniciarPartida via WebSocket
      const iniciarPartidaMessage = {
        action: 'iniciarPartida' as const,
        data: {
          timeId: team.id,
          cabineId: cabineIdNum,
        },
      };
      
      console.log('[Lobby] Enviando iniciarPartida via WebSocket:', JSON.stringify(iniciarPartidaMessage, null, 2));
      console.log('[Lobby] Detalhes:', {
        timeId: team.id,
        timeNome: team.nome,
        cabineId: cabineIdNum,
      });
      
      wsService.send(iniciarPartidaMessage);
      
    } catch (error) {
      console.error('[Lobby] Erro ao iniciar partida:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribeGeneric) {
        unsubscribeGeneric();
      }
      Alert.alert('Erro', `Falha ao iniciar partida: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby do Time</Text>
      {team && (
        <Text style={styles.teamName}>{team.nome}</Text>
      )}

      {players.length > 0 && (
        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Jogadores</Text>
          <FlatList
            data={players}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.playerItem}>
                <Text style={styles.playerName}>{item.nickname}</Text>
              </View>
            )}
          />
        </View>
      )}

      <View style={styles.cabineIdSection}>
        <Text style={styles.sectionTitle}>ID da Cabine</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o ID da cabine"
          placeholderTextColor="#9ca3af"
          value={cabineIdInput}
          onChangeText={setCabineIdInput}
          keyboardType="numeric"
          editable={!loading}
        />
      </View>

      <Pressable
        style={[styles.startButton, (loading || !cabineIdInput.trim()) && styles.buttonDisabled]}
        onPress={handleStartGame}
        disabled={loading || !cabineIdInput.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>Iniciar Desarme</Text>
        )}
      </Pressable>

      {loading && (
        <Text style={styles.warning}>Conectando ao servidor de partidas...</Text>
      )}
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
    marginBottom: 8,
    textAlign: 'center',
  },
  teamName: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  playersSection: {
    flex: 1,
    marginBottom: 24,
  },
  cabineIdSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#111827',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  playerItem: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
  },
  startButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  warning: {
    color: '#fbbf24',
    textAlign: 'center',
    fontSize: 12,
  },
});

