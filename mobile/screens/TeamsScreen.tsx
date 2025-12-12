import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { wsService } from '../services/WebSocketService';
import { useGame } from '../context/GameContext';

interface TeamsScreenProps {
  onJoinTeam: () => void;
}

export const TeamsScreen: React.FC<TeamsScreenProps> = ({ onJoinTeam }) => {
  const { setTeam } = useGame();
  const [teamName, setTeamName] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const createTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await wsService.connect('time');
        setWsConnected(true);

        // Listener para criar time - pode vir como 'timeCreated' ou dentro do data
        const unsubscribeCreated = wsService.onMessage('timeCreated', (data) => {
          console.log('[TeamsScreen] timeCreated recebido (específico):', JSON.stringify(data, null, 2));
          if (createTimeoutRef.current) {
            clearTimeout(createTimeoutRef.current);
            createTimeoutRef.current = null;
          }
          setLoading(false);
          
          // Pode vir direto como objeto ou dentro de data
          const teamData = data?.id ? data : data?.data || data;
          if (teamData && teamData.id && teamData.nome) {
            setTeam({ id: teamData.id, nome: teamData.nome });
            onJoinTeam();
          } else {
            console.error('[TeamsScreen] Resposta inválida ao criar time:', data);
            Alert.alert('Erro', 'Resposta inválida ao criar time');
          }
          unsubscribeCreated();
        });

        // Listener para entrar em time - pode vir como 'timeJoined' ou dentro do data
        const unsubscribeJoined = wsService.onMessage('timeJoined', (data) => {
          console.log('[TeamsScreen] timeJoined recebido (específico):', JSON.stringify(data, null, 2));
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
          setLoading(false);
          
          // Pode vir direto como objeto ou dentro de data
          const teamData = data?.id ? data : data?.data || data;
          if (teamData && teamData.id && teamData.nome) {
            setTeam({ id: teamData.id, nome: teamData.nome });
            onJoinTeam();
          } else {
            console.error('[TeamsScreen] Resposta inválida ao entrar no time:', data);
            Alert.alert('Erro', 'Resposta inválida ao entrar no time');
          }
          unsubscribeJoined();
        });

        // Listener genérico para mensagens do servidor
        const unsubscribeGeneric = wsService.onMessage('*', (response) => {
          console.log('[TeamsScreen] Mensagem genérica recebida:', JSON.stringify(response, null, 2));
          const actionType = response.action || response.type;
          console.log('[TeamsScreen] Action/Tipo:', actionType);
          console.log('[TeamsScreen] Success:', response.success);
          console.log('[TeamsScreen] Tem erro?', !!response.error);
          console.log('[TeamsScreen] Dados:', response.data);
          
          // Verificar se é uma resposta de sucesso para createTime ou joinTeam
          // Pode vir como action 'timeCreated', 'timeJoined' ou success=true com dados do time
          const isTimeResponse = actionType === 'timeCreated' || actionType === 'timeJoined' ||
            (response.success === true && response.data && (response.data.id || response.data.nome));
            
          if (isTimeResponse && response.success !== false) {
            
            const data = response.data;
            console.log('[TeamsScreen] Processando resposta de time. Action:', actionType);
            console.log('[TeamsScreen] Dados completos:', JSON.stringify(data, null, 2));
            
            // Extrair dados do time (pode estar direto em data ou dentro de data.data)
            let teamData = data;
            if (data?.data && data.data.id) {
              teamData = data.data;
            } else if (data?.id) {
              teamData = data;
            }
            
            console.log('[TeamsScreen] TeamData extraído:', JSON.stringify(teamData, null, 2));
            
            if (teamData && teamData.id && teamData.nome) {
              // Limpar timeout
              if ((actionType === 'timeCreated' || (response.success && loading)) && createTimeoutRef.current) {
                console.log('[TeamsScreen] Limpando timeout de create');
                clearTimeout(createTimeoutRef.current);
                createTimeoutRef.current = null;
              }
              if ((actionType === 'timeJoined' || (response.success && loading)) && joinTimeoutRef.current) {
                console.log('[TeamsScreen] Limpando timeout de join');
                clearTimeout(joinTimeoutRef.current);
                joinTimeoutRef.current = null;
              }
              
              setLoading(false);
              console.log('[TeamsScreen] Definindo team:', { id: teamData.id, nome: teamData.nome });
              setTeam({ id: teamData.id, nome: teamData.nome });
              onJoinTeam();
            } else {
              console.warn('[TeamsScreen] Dados incompletos na resposta:', {
                teamData,
                hasId: !!teamData?.id,
                hasNome: !!teamData?.nome,
              });
            }
          }
          
          // Se for erro ou success === false
          if (response.error || response.success === false || actionType === 'error') {
            console.error('[TeamsScreen] Erro detectado na mensagem:', response.error || response.message);
            if (createTimeoutRef.current) {
              clearTimeout(createTimeoutRef.current);
              createTimeoutRef.current = null;
            }
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }
            setLoading(false);
            
            const errorMsg = response.error || response.message || response.data?.message || 'Erro desconhecido';
            console.error('[TeamsScreen] Exibindo alerta de erro:', errorMsg);
            Alert.alert('Erro', errorMsg);
          }
        });

        // Listener para erros
        const unsubscribeError = wsService.onMessage('error', (data) => {
          console.log('Erro recebido:', data);
          if (createTimeoutRef.current) {
            clearTimeout(createTimeoutRef.current);
            createTimeoutRef.current = null;
          }
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
          setLoading(false);
          Alert.alert('Erro', data.message || data.error || 'Erro desconhecido');
          unsubscribeError();
        });

        return () => {
          unsubscribeCreated();
          unsubscribeJoined();
          unsubscribeGeneric();
          unsubscribeError();
        };
      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
        Alert.alert('Erro', 'Falha ao conectar WebSocket');
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      // Não desconectar aqui para manter a conexão entre navegações
    };
  }, [onJoinTeam, setTeam]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Erro', 'Digite um nome para o time');
      return;
    }

    if (!wsService.isConnected()) {
      Alert.alert('Erro', 'WebSocket não está conectado');
      return;
    }

    setLoading(true);
    
    try {
      const messageData = { nome: teamName.trim() };
      console.log('[TeamsScreen] Criar time - Nome:', teamName.trim());
      console.log('[TeamsScreen] Criar time - Dados:', messageData);
      
      const message: { action: 'createTime'; data: { nome: string } } = {
        action: 'createTime',
        data: messageData,
      };
      
      console.log('[TeamsScreen] Criar time - Mensagem completa:', JSON.stringify(message, null, 2));
      
      // Criar um listener temporário específico para esta ação
      const tempListener = wsService.onMessage('*', (response) => {
        console.log('[TeamsScreen] Resposta após createTime:', JSON.stringify(response, null, 2));
        console.log('[TeamsScreen] Verificando resposta - success:', response.success, 'action:', response.action);
        
        // Ignorar mensagem de conexão
        if (response.action === 'connected') {
          console.log('[TeamsScreen] Ignorando mensagem de conexão');
          return;
        }
        
        // Verificar se é uma resposta de sucesso com dados do time
        if (response.success === true && response.data) {
          const teamData = response.data;
          console.log('[TeamsScreen] TeamData extraído:', JSON.stringify(teamData, null, 2));
          console.log('[TeamsScreen] Tem id?', !!teamData.id, 'Tem nome?', !!teamData.nome);
          
          // Verificar se tem id e nome (dados do time)
          if (teamData.id && teamData.nome) {
            console.log('[TeamsScreen] ✅ Time criado com sucesso!', teamData);
            if (createTimeoutRef.current) {
              clearTimeout(createTimeoutRef.current);
              createTimeoutRef.current = null;
            }
            tempListener(); // Remove listener primeiro
            setLoading(false);
            setTeam({ id: teamData.id, nome: teamData.nome });
            setTimeout(() => {
              onJoinTeam();
            }, 100); // Pequeno delay para garantir que o state foi atualizado
            return;
          }
          
          // Também verificar se os dados estão em data.data (estrutura aninhada)
          if (teamData.data && teamData.data.id && teamData.data.nome) {
            console.log('[TeamsScreen] ✅ Time criado com sucesso (dados aninhados)!', teamData.data);
            if (createTimeoutRef.current) {
              clearTimeout(createTimeoutRef.current);
              createTimeoutRef.current = null;
            }
            tempListener(); // Remove listener primeiro
            setLoading(false);
            setTeam({ id: teamData.data.id, nome: teamData.data.nome });
            setTimeout(() => {
              onJoinTeam();
            }, 100);
            return;
          }
        }
        
        // Verificar action específica
        if (response.action === 'timeCreated' && response.data) {
          const teamData = response.data.id ? response.data : (response.data.data || response.data);
          if (teamData && teamData.id && teamData.nome) {
            console.log('[TeamsScreen] ✅ Time criado (via action)!', teamData);
            if (createTimeoutRef.current) {
              clearTimeout(createTimeoutRef.current);
              createTimeoutRef.current = null;
            }
            tempListener();
            setLoading(false);
            setTeam({ id: teamData.id, nome: teamData.nome });
            setTimeout(() => {
              onJoinTeam();
            }, 100);
            return;
          }
        }
        
        console.log('[TeamsScreen] Resposta não processada ainda, continuando escuta...');
      });
      
      wsService.send(message);
      
      // Timeout de segurança - se não receber resposta em 15 segundos, mostrar erro
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
      }
      createTimeoutRef.current = setTimeout(() => {
        tempListener(); // Remove listener temporário
        setLoading(false);
        createTimeoutRef.current = null;
        Alert.alert('Timeout', 'Não recebemos resposta do servidor. O time pode ter sido criado, mas não recebemos confirmação.');
      }, 15000);
    } catch (error) {
      console.error('Erro ao criar time:', error);
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
        createTimeoutRef.current = null;
      }
      setLoading(false);
      Alert.alert('Erro', `Falha ao criar time: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinTeamName.trim()) {
      Alert.alert('Erro', 'Digite o nome do time');
      return;
    }

    if (!wsService.isConnected()) {
      Alert.alert('Erro', 'WebSocket não está conectado');
      return;
    }

    setLoading(true);
    
    try {
      const messageData = { nome: joinTeamName.trim() };
      console.log('[TeamsScreen] Entrar no time - Nome:', joinTeamName.trim());
      console.log('[TeamsScreen] Entrar no time - Dados:', messageData);
      
      const message: { action: 'joinTeam'; data: { nome: string } } = {
        action: 'joinTeam',
        data: messageData,
      };
      
      console.log('[TeamsScreen] Entrar no time - Mensagem completa:', JSON.stringify(message, null, 2));
      
      // Criar um listener temporário específico para esta ação
      const tempListener = wsService.onMessage('*', (response) => {
        console.log('[TeamsScreen] Resposta após joinTeam:', JSON.stringify(response, null, 2));
        console.log('[TeamsScreen] Verificando resposta - success:', response.success, 'action:', response.action);
        
        // Ignorar mensagem de conexão
        if (response.action === 'connected') {
          console.log('[TeamsScreen] Ignorando mensagem de conexão');
          return;
        }
        
        // Verificar se é uma resposta de sucesso com dados do time
        if (response.success === true && response.data) {
          const teamData = response.data;
          console.log('[TeamsScreen] TeamData extraído:', JSON.stringify(teamData, null, 2));
          console.log('[TeamsScreen] Tem id?', !!teamData.id, 'Tem nome?', !!teamData.nome);
          
          // Verificar se tem id e nome (dados do time)
          if (teamData.id && teamData.nome) {
            console.log('[TeamsScreen] ✅ Entrou no time com sucesso!', teamData);
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }
            tempListener(); // Remove listener primeiro
            setLoading(false);
            setTeam({ id: teamData.id, nome: teamData.nome });
            setTimeout(() => {
              onJoinTeam();
            }, 100); // Pequeno delay para garantir que o state foi atualizado
            return;
          }
          
          // Também verificar se os dados estão em data.data (estrutura aninhada)
          if (teamData.data && teamData.data.id && teamData.data.nome) {
            console.log('[TeamsScreen] ✅ Entrou no time (dados aninhados)!', teamData.data);
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }
            tempListener(); // Remove listener primeiro
            setLoading(false);
            setTeam({ id: teamData.data.id, nome: teamData.data.nome });
            setTimeout(() => {
              onJoinTeam();
            }, 100);
            return;
          }
        }
        
        // Verificar action específica
        if (response.action === 'timeJoined' && response.data) {
          const teamData = response.data.id ? response.data : (response.data.data || response.data);
          if (teamData && teamData.id && teamData.nome) {
            console.log('[TeamsScreen] ✅ Entrou no time (via action)!', teamData);
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }
            tempListener();
            setLoading(false);
            setTeam({ id: teamData.id, nome: teamData.nome });
            setTimeout(() => {
              onJoinTeam();
            }, 100);
            return;
          }
        }
        
        console.log('[TeamsScreen] Resposta não processada ainda, continuando escuta...');
      });
      
      wsService.send(message);
      
      // Timeout de segurança - se não receber resposta em 15 segundos, mostrar erro
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
      joinTimeoutRef.current = setTimeout(() => {
        tempListener(); // Remove listener temporário
        setLoading(false);
        joinTimeoutRef.current = null;
        Alert.alert('Timeout', 'Não recebemos resposta do servidor. Verifique se o nome do time está correto.');
      }, 15000);
    } catch (error) {
      console.error('Erro ao entrar no time:', error);
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      setLoading(false);
      Alert.alert('Erro', `Falha ao entrar no time: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  if (!wsConnected) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Conectando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Times</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Criar Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do time"
          placeholderTextColor="#9ca3af"
          value={teamName}
          onChangeText={setTeamName}
          editable={!loading}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateTeam}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Criar</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entrar no Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do time"
          placeholderTextColor="#9ca3af"
          value={joinTeamName}
          onChangeText={setJoinTeamName}
          editable={!loading}
          autoCapitalize="words"
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoinTeam}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
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
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  section: {
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 24,
  },
});

