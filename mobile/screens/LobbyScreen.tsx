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
  const { 
    team, 
    players, 
    cabineId,
    bluetoothDeviceName,
    cabinRole,
    playersInCabin,
    isMockMode,
    setPlayers, 
    setPartidaId, 
    setQuestions, 
    setGameState 
  } = useGame();
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Verificar se já está conectado (pode estar conectado ao WebSocket de times)
    setWsConnected(wsService.isConnected());
    
    const unsubscribe = wsService.onConnectionChange((connected) => {
      setWsConnected(connected);
    });

    // Se tem time mas não tem players, buscar informações do time
    const loadTeamInfo = async () => {
      // Em modo mock, não tentar conectar ao WebSocket
      if (isMockMode) {
        console.log('[Lobby] Modo mock ativo - pulando conexão WebSocket');
        return;
      }

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
  }, [team, players.length, setPlayers, isMockMode]);

  const handleStartGame = async () => {
    if (!team) {
      Alert.alert('Erro', 'Você precisa estar em um time');
      return;
    }

    if (!cabineId) {
      Alert.alert('Erro', 'ID da cabine não encontrado. Escaneie o QR Code novamente.');
      return;
    }

    // Apenas o líder pode iniciar o jogo (exceto em modo mock para debug)
    if (cabinRole !== 'leader' && !isMockMode) {
      Alert.alert('Atenção', 'Apenas o líder do time pode iniciar o desafio');
      return;
    }

    if (!bluetoothService.isConnected() && !bluetoothService.isMockModeEnabled()) {
      Alert.alert('Erro', 'Conecte-se à cabine primeiro');
      return;
    }

    setLoading(true);

    // MODO MOCK: Pular toda a lógica de WebSocket
    if (isMockMode) {
      console.log('[Lobby] Modo Mock - Iniciando jogo sem WebSocket');
      
      try {
        // Simular ID de partida
        const mockPartidaId = Math.floor(Math.random() * 10000) + 1000;
        setPartidaId(mockPartidaId);
        console.log('[Lobby] Mock: Partida ID gerado:', mockPartidaId);

        // Enviar comando Bluetooth mock
        await bluetoothService.sendCommand('INICIAR');
        console.log('[Lobby] Mock: Comando INICIAR enviado via Bluetooth');

        // Ativar modo mock no QuestionService
        QuestionService.enableMockMode();

        // Buscar perguntas mock
        const questions = await QuestionService.getRandomQuestions(5);
        console.log('[Lobby] Mock: Perguntas carregadas:', questions.length);
        
        if (!questions || questions.length === 0) {
          console.error('[Lobby] Mock: Nenhuma pergunta foi carregada');
          setLoading(false);
          Alert.alert('Erro', 'Falha ao carregar perguntas. Tente novamente.');
          return;
        }
        
        setQuestions(questions);
        setGameState('armed');

        // Navegar para Quiz
        setLoading(false);
        setTimeout(() => {
          console.log('[Lobby] Mock: Navegando para Quiz...');
          onStartGame();
        }, 500);
        
        return;
      } catch (error) {
        console.error('[Lobby] Erro no modo mock:', error);
        setLoading(false);
        Alert.alert('Erro', `Falha ao iniciar modo mock: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        return;
      }
    }
    
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
          // cabineId já foi setado no QRCodeScanner

          // 3. Enviar Bluetooth INICIAR
          try {
            await bluetoothService.sendCommand('INICIAR');
          } catch (error) {
            console.error('Failed to send INICIAR:', error);
          }

          // 4. Buscar perguntas via HTTP (ou mock se isMockMode estiver ativo)
          if (isMockMode) {
            QuestionService.enableMockMode();
          } else {
            QuestionService.disableMockMode();
          }
          
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
          cabineId: cabineId,
        },
      };
      
      console.log('[Lobby] Enviando iniciarPartida via WebSocket:', JSON.stringify(iniciarPartidaMessage, null, 2));
      console.log('[Lobby] Detalhes:', {
        timeId: team.id,
        timeNome: team.nome,
        cabineId: cabineId,
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

  // Usar playersInCabin se disponível (do WebSocket), senão converter players local para formato compatível
  const displayPlayers = playersInCabin.length > 0 
    ? playersInCabin 
    : players.map(p => ({ ...p, isLeader: false, joinedAt: new Date().toISOString() }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby do Time</Text>
      
      {team && (
        <Text style={styles.teamName}>{team.nome}</Text>
      )}

      {/* Info da Cabine */}
      <View style={styles.cabinInfoSection}>
        <Text style={styles.sectionTitle}>📱 Informações da Cabine</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ID:</Text>
          <Text style={styles.infoValue}>#{cabineId}</Text>
        </View>
        
        {bluetoothDeviceName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bluetooth:</Text>
            <Text style={styles.infoValueMono}>{bluetoothDeviceName}</Text>
          </View>
        )}
        
        {cabinRole && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Função:</Text>
            <Text style={[styles.infoValue, cabinRole === 'leader' && styles.leaderText]}>
              {cabinRole === 'leader' ? '👑 Líder' : '👤 Participante'}
            </Text>
          </View>
        )}
        
        {isMockMode && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>🧪 MODO MOCK ATIVO</Text>
          </View>
        )}
      </View>

      {/* Lista de Jogadores */}
      {displayPlayers.length > 0 && (
        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>👥 Jogadores ({displayPlayers.length})</Text>
          <FlatList
            data={displayPlayers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.playerItem}>
                <Text style={styles.playerName}>
                  {item.isLeader ? '👑 ' : ''}
                  {item.nickname}
                  {item.isLeader ? ' (Líder)' : ''}
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {/* Botão Iniciar (apenas para líder) */}
      {cabinRole === 'leader' ? (
        <Pressable
          style={[styles.startButton, loading && styles.buttonDisabled]}
          onPress={handleStartGame}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startButtonText}>🚀 Iniciar Desafio</Text>
          )}
        </Pressable>
      ) : (
        <>
          <View style={styles.waitingBox}>
            <Text style={styles.waitingText}>⏳ Aguardando o líder iniciar o desafio...</Text>
          </View>
          
          {/* Botão de debug em modo mock para participantes */}
          {isMockMode && (
            <Pressable
              style={[styles.mockDebugButton, loading && styles.buttonDisabled]}
              onPress={handleStartGame}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mockDebugButtonText}>
                  🧪 [Mock Debug] Forçar Início do Jogo
                </Text>
              )}
            </Pressable>
          )}
        </>
      )}

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
    marginBottom: 16,
    textAlign: 'center',
  },
  cabinInfoSection: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValueMono: {
    color: '#3b82f6',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  leaderText: {
    color: '#fbbf24',
  },
  mockBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mockBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  playersSection: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerItem: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
  },
  startButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
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
  waitingBox: {
    backgroundColor: '#1f2937',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  waitingText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mockDebugButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#a78bfa',
    borderStyle: 'dashed',
  },
  mockDebugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warning: {
    color: '#fbbf24',
    textAlign: 'center',
    fontSize: 12,
  },
});

