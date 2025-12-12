import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { wsService } from '../services/WebSocketService';
import { useGame } from '../context/GameContext';
import { AuthService } from '../services/AuthService';

interface Team {
  id: number;
  nome: string;
  participantes: Array<{
    id: number;
    nickname: string;
  }>;
}

interface BrowseTeamsScreenProps {
  onJoinTeam: () => void;
}

const API_BASE_URL = 'https://rodarico.app.br/api';

export const BrowseTeamsScreen: React.FC<BrowseTeamsScreenProps> = ({ onJoinTeam }) => {
  const { setTeam } = useGame();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningTeamId, setJoiningTeamId] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joiningTeamIdRef = useRef<number | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await wsService.connect('time');
        setWsConnected(true);

        // Listener para timeJoined
        const unsubscribeJoined = wsService.onMessage('timeJoined', (data) => {
          console.log('[BrowseTeams] timeJoined recebido:', JSON.stringify(data, null, 2));
          setJoiningTeamId(null);
          
          const teamData = data?.id ? data : (data?.data || data);
          if (teamData && teamData.id && teamData.nome) {
            setTeam({ id: teamData.id, nome: teamData.nome });
            unsubscribeJoined();
            onJoinTeam();
          } else {
            Alert.alert('Erro', 'Resposta inválida ao entrar no time');
          }
        });

        // Listener genérico para capturar qualquer resposta de sucesso
        const unsubscribeGeneric = wsService.onMessage('*', (response) => {
          console.log('[BrowseTeams] Mensagem recebida:', JSON.stringify(response, null, 2));
          
          if (response.action === 'connected') {
            console.log('[BrowseTeams] Ignorando mensagem de conexão');
            return;
          }

          // Verificar se é uma resposta de sucesso com dados do time
          if (response.success === true && response.data) {
            const data = response.data;
            console.log('[BrowseTeams] Dados recebidos:', JSON.stringify(data, null, 2));
            
            // Extrair teamResponse de diferentes estruturas aninhadas
            let teamResponse = null;
            
            // Estrutura: data.data.response (formato atual do servidor)
            if (data.data && data.data.response && data.data.response.id && data.data.response.nome) {
              teamResponse = data.data.response;
              console.log('[BrowseTeams] ✅ Estrutura encontrada: data.data.response');
            }
            // Estrutura: data.response
            else if (data.response && data.response.id && data.response.nome) {
              teamResponse = data.response;
              console.log('[BrowseTeams] ✅ Estrutura encontrada: data.response');
            }
            // Estrutura direta: data
            else if (data.id && data.nome) {
              teamResponse = data;
              console.log('[BrowseTeams] ✅ Estrutura encontrada: data direto');
            }
            
            // Verificar se há um join em andamento (usar ref para evitar problemas de closure)
            if (teamResponse && teamResponse.id && teamResponse.nome && joiningTeamIdRef.current !== null) {
              console.log('[BrowseTeams] ✅✅✅ Entrou no time com sucesso!', teamResponse);
              
              // Limpar timeout
              if (joinTimeoutRef.current) {
                clearTimeout(joinTimeoutRef.current);
                joinTimeoutRef.current = null;
              }
              
              // Limpar refs e estado
              const joinedTeamId = joiningTeamIdRef.current;
              joiningTeamIdRef.current = null;
              setJoiningTeamId(null);
              setTeam({ id: teamResponse.id, nome: teamResponse.nome });
              
              // Remover listeners antes de navegar
              unsubscribeGeneric();
              unsubscribeJoined();
              
              setTimeout(() => {
                console.log('[BrowseTeams] Navegando para lobby... (teamId:', joinedTeamId, ')');
                onJoinTeam();
              }, 100);
              
              return;
            }
            
            console.warn('[BrowseTeams] ⚠️ Estrutura de dados não reconhecida:', JSON.stringify(data, null, 2));
          }

          // Verificar action específica (joinTeam)
          if (response.action === 'joinTeam' && response.success === true && response.data) {
            const data = response.data;
            console.log('[BrowseTeams] Action joinTeam detectada:', JSON.stringify(data, null, 2));
            
            let teamResponse = null;
            
            if (data.data && data.data.response && data.data.response.id && data.data.response.nome) {
              teamResponse = data.data.response;
            } else if (data.response && data.response.id && data.response.nome) {
              teamResponse = data.response;
            } else if (data.id && data.nome) {
              teamResponse = data;
            }
            
            // Verificar se há um join em andamento (usar ref para evitar problemas de closure)
            if (teamResponse && teamResponse.id && teamResponse.nome && joiningTeamIdRef.current !== null) {
              console.log('[BrowseTeams] ✅ Entrou no time (via action joinTeam)!', teamResponse);
              
              // Limpar timeout
              if (joinTimeoutRef.current) {
                clearTimeout(joinTimeoutRef.current);
                joinTimeoutRef.current = null;
              }
              
              // Limpar refs e estado
              const joinedTeamId = joiningTeamIdRef.current;
              joiningTeamIdRef.current = null;
              setJoiningTeamId(null);
              setTeam({ id: teamResponse.id, nome: teamResponse.nome });
              
              unsubscribeGeneric();
              unsubscribeJoined();
              
              setTimeout(() => {
                console.log('[BrowseTeams] Navegando para lobby... (teamId:', joinedTeamId, ')');
                onJoinTeam();
              }, 100);
              
              return;
            }
          }

          // Verificar erros de joinTeam (só se há um join em andamento)
          if (response.action === 'joinTeam' && (response.error || response.success === false) && joiningTeamIdRef.current !== null) {
            console.error('[BrowseTeams] ❌ Erro detectado:', response.error || response.message);
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }
            joiningTeamIdRef.current = null;
            setJoiningTeamId(null);
            unsubscribeGeneric();
            unsubscribeJoined();
            const errorMsg = response.error || response.message || 'Erro desconhecido';
            Alert.alert('Erro', errorMsg);
          }
        });

        return () => {
          unsubscribeJoined();
          unsubscribeGeneric();
        };
      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
        Alert.alert('Erro', 'Falha ao conectar WebSocket');
        setWsConnected(false);
      }
    };

    connect();
    loadTeams();
  }, [onJoinTeam, setTeam]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const token = await AuthService.getAccessToken();
      if (!token) {
        Alert.alert('Erro', 'Token não disponível');
        setLoading(false);
        return;
      }

      // Remover "Bearer " se presente
      const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

      const response = await fetch(`${API_BASE_URL}/time`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await AuthService.refreshToken();
          if (refreshed) {
            return loadTeams();
          }
        }
        throw new Error(`Failed to fetch teams: ${response.statusText}`);
      }

      const teamsData: Team[] = await response.json();
      console.log('[BrowseTeams] Times carregados:', teamsData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Erro ao buscar times:', error);
      Alert.alert('Erro', `Falha ao buscar times: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId: number) => {
    if (!wsService.isConnected()) {
      Alert.alert('Erro', 'WebSocket não está conectado');
      return;
    }

    // Se já está tentando entrar em outro time, cancelar
    if (joiningTeamIdRef.current !== null && joiningTeamIdRef.current !== teamId) {
      console.log('[BrowseTeams] Cancelando join anterior para teamId:', joiningTeamIdRef.current);
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
    }

    // Atualizar ref e estado
    joiningTeamIdRef.current = teamId;
    setJoiningTeamId(teamId);
    
    try {
      const joinTeamMessage = {
        action: 'joinTeam' as const,
        data: { id: teamId },
      };
      
      console.log('[BrowseTeams] Enviando joinTeam:', JSON.stringify(joinTeamMessage, null, 2));
      console.log('[BrowseTeams] Detalhes:', {
        teamId,
      });
      
      wsService.send(joinTeamMessage);

      // Timeout de segurança
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
      joinTimeoutRef.current = setTimeout(() => {
        // Verificar se ainda está tentando entrar neste time específico
        if (joiningTeamIdRef.current === teamId) {
          console.log('[BrowseTeams] Timeout ao entrar no time:', teamId);
          joiningTeamIdRef.current = null;
          setJoiningTeamId(null);
          Alert.alert('Timeout', 'Não recebemos resposta do servidor. Tente novamente.');
        }
        if (joinTimeoutRef.current) {
          joinTimeoutRef.current = null;
        }
      }, 15000);
    } catch (error) {
      console.error('Erro ao entrar no time:', error);
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      joiningTeamIdRef.current = null;
      setJoiningTeamId(null);
      Alert.alert('Erro', `Falha ao entrar no time: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando times...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscar Times</Text>

      <Pressable style={styles.refreshButton} onPress={loadTeams}>
        <Text style={styles.refreshButtonText}>Atualizar Lista</Text>
      </Pressable>

      <FlatList
        data={teams}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.teamCard}>
            <Text style={styles.teamName}>{item.nome}</Text>
            <Text style={styles.teamId}>ID: {item.id}</Text>
            <Text style={styles.participantsLabel}>
              Participantes ({item.participantes.length}):
            </Text>
            {item.participantes.map((p) => (
              <Text key={p.id} style={styles.participant}>
                • {p.nickname}
              </Text>
            ))}
            <Pressable
              style={[
                styles.joinButton,
                (joiningTeamId === item.id || !wsConnected) && styles.joinButtonDisabled,
              ]}
              onPress={() => handleJoinTeam(item.id)}
              disabled={joiningTeamId === item.id || !wsConnected}
            >
              {joiningTeamId === item.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Entrar</Text>
              )}
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum time encontrado</Text>
        }
      />
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
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  teamCard: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  teamName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamId: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  participantsLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  participant: {
    color: '#d1d5db',
    fontSize: 13,
    marginLeft: 8,
    marginBottom: 2,
  },
  joinButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
});

