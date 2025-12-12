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

interface CreateTeamScreenProps {
  onJoinTeam: () => void;
}

export const CreateTeamScreen: React.FC<CreateTeamScreenProps> = ({ onJoinTeam }) => {
  const { setTeam } = useGame();
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const createTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await wsService.connect('time');
        setWsConnected(true);

        // Listener genérico para capturar resposta de createTime
        const unsubscribeGeneric = wsService.onMessage('*', (response) => {
          console.log('[CreateTeam] Mensagem recebida:', JSON.stringify(response, null, 2));
          
          // Ignorar mensagem de conexão
          if (response.action === 'connected') {
            console.log('[CreateTeam] Ignorando mensagem de conexão');
            return;
          }

          // Verificar se é uma resposta de sucesso com dados do time
          if (response.success === true && response.data) {
            const data = response.data;
            console.log('[CreateTeam] Dados recebidos:', JSON.stringify(data, null, 2));
            
            // Extrair teamResponse de diferentes estruturas aninhadas
            let teamResponse = null;
            
            // Estrutura: data.data.response (formato atual do servidor)
            if (data.data && data.data.response && data.data.response.id && data.data.response.nome) {
              teamResponse = data.data.response;
              console.log('[CreateTeam] ✅ Estrutura encontrada: data.data.response');
            }
            // Estrutura: data.response
            else if (data.response && data.response.id && data.response.nome) {
              teamResponse = data.response;
              console.log('[CreateTeam] ✅ Estrutura encontrada: data.response');
            }
            // Estrutura direta: data
            else if (data.id && data.nome) {
              teamResponse = data;
              console.log('[CreateTeam] ✅ Estrutura encontrada: data direto');
            }
            
            if (teamResponse && teamResponse.id && teamResponse.nome) {
              console.log('[CreateTeam] ✅✅✅ Time criado com sucesso!', teamResponse);
              
              // Limpar timeout imediatamente
              if (createTimeoutRef.current) {
                console.log('[CreateTeam] Limpando timeout');
                clearTimeout(createTimeoutRef.current);
                createTimeoutRef.current = null;
              }
              
              // Remover listener antes de atualizar estado
              unsubscribeGeneric();
              
              // Atualizar estado e navegar
              setLoading(false);
              setTeam({ id: teamResponse.id, nome: teamResponse.nome });
              
              setTimeout(() => {
                console.log('[CreateTeam] Navegando para lobby...');
                onJoinTeam();
              }, 100);
              
              return; // IMPORTANTE: sair do listener após sucesso
            }
            
            console.warn('[CreateTeam] ⚠️ Estrutura de dados não reconhecida:', JSON.stringify(data, null, 2));
          }

          // Verificar action específica (createTime) - fallback
          if (response.action === 'createTime' && response.success === true && response.data) {
            const data = response.data;
            console.log('[CreateTeam] Action createTime detectada:', JSON.stringify(data, null, 2));
            
            let teamResponse = null;
            
            if (data.data && data.data.response && data.data.response.id && data.data.response.nome) {
              teamResponse = data.data.response;
            } else if (data.response && data.response.id && data.response.nome) {
              teamResponse = data.response;
            } else if (data.id && data.nome) {
              teamResponse = data;
            }
            
            if (teamResponse && teamResponse.id && teamResponse.nome) {
              console.log('[CreateTeam] ✅ Time criado (via action createTime)!', teamResponse);
              
              if (createTimeoutRef.current) {
                clearTimeout(createTimeoutRef.current);
                createTimeoutRef.current = null;
              }
              
              unsubscribeGeneric();
              setLoading(false);
              setTeam({ id: teamResponse.id, nome: teamResponse.nome });
              
              setTimeout(() => {
                onJoinTeam();
              }, 100);
              
              return;
            }
          }

          // Verificar erros de createTime
          if (response.action === 'createTime' && (response.error || response.success === false)) {
            console.error('[CreateTeam] ❌ Erro detectado:', response.error || response.message);
            if (createTimeoutRef.current) {
              clearTimeout(createTimeoutRef.current);
              createTimeoutRef.current = null;
            }
            setLoading(false);
            unsubscribeGeneric();
            const errorMsg = response.error || response.message || 'Erro desconhecido';
            Alert.alert('Erro', errorMsg);
          }
        });

        return () => {
          unsubscribeGeneric();
        };
      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
        Alert.alert('Erro', 'Falha ao conectar WebSocket');
        setWsConnected(false);
      }
    };

    connect();
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
      console.log('[CreateTeam] Criar time - Nome:', teamName.trim());
      
      const message: { action: 'createTime'; data: { nome: string } } = {
        action: 'createTime',
        data: messageData,
      };
      
      console.log('[CreateTeam] Enviando mensagem:', JSON.stringify(message, null, 2));
      
      wsService.send(message);
      
      // Timeout de segurança
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
      }
      createTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        createTimeoutRef.current = null;
        Alert.alert('Timeout', 'Não recebemos resposta do servidor. Tente novamente.');
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar Time</Text>
      <Text style={styles.subtitle}>Digite o nome do seu time</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome do time"
        placeholderTextColor="#9ca3af"
        value={teamName}
        onChangeText={setTeamName}
        editable={!loading}
        autoCapitalize="words"
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreateTeam}
        disabled={loading || !wsConnected}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Criar</Text>
        )}
      </Pressable>

      {!wsConnected && (
        <Text style={styles.warning}>Conectando ao servidor...</Text>
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
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#111827',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  button: {
    backgroundColor: '#3b82f6',
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
  warning: {
    color: '#fbbf24',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
  },
});

