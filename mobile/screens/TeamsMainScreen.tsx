import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { wsService } from '../services/WebSocketService';
import { AuthService } from '../services/AuthService';
import { useGame } from '../context/GameContext';

interface TeamsMainScreenProps {
  onCreateTeam: () => void;
  onBrowseTeams: () => void;
  onAlreadyInTeam: () => void;
}

const API_BASE_URL = 'https://rodarico.app.br/api';

export const TeamsMainScreen: React.FC<TeamsMainScreenProps> = ({
  onCreateTeam,
  onBrowseTeams,
  onAlreadyInTeam,
}) => {
  const { team, setTeam, setPlayers } = useGame();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserTeam = async () => {
      try {
        // Tentar buscar time atual do usuário via HTTP
        const token = await AuthService.getAccessToken();
        if (!token) {
          setChecking(false);
          return;
        }

        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

        const response = await fetch(`${API_BASE_URL}/time/current`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const teamData = await response.json();
          console.log('[TeamsMain] Usuário já está em um time:', teamData);
          
          if (teamData && teamData.id && teamData.nome) {
            setTeam({ id: teamData.id, nome: teamData.nome });
            
            // Atualizar participantes se disponível
            if (teamData.participantes && Array.isArray(teamData.participantes)) {
              setPlayers(teamData.participantes);
            }
            
            // Redirecionar para Lobby
            setTimeout(() => {
              onAlreadyInTeam();
            }, 100);
            return;
          }
        } else if (response.status === 404) {
          // Usuário não está em nenhum time - normal, continuar
          console.log('[TeamsMain] Usuário não está em nenhum time');
        } else {
          console.warn('[TeamsMain] Erro ao verificar time:', response.status);
        }
      } catch (error) {
        console.error('[TeamsMain] Erro ao verificar time do usuário:', error);
        // Em caso de erro, continuar normalmente
      } finally {
        setChecking(false);
      }
    };

    checkUserTeam();
  }, [setTeam, setPlayers, onAlreadyInTeam]);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.checkingText}>Verificando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Times</Text>
      <Text style={styles.subtitle}>Escolha uma opção</Text>

      <Pressable style={styles.button} onPress={onCreateTeam}>
        <Text style={styles.buttonText}>Criar Time</Text>
      </Pressable>

      <Pressable style={styles.buttonSecondary} onPress={onBrowseTeams}>
        <Text style={styles.buttonSecondaryText}>Buscar Times</Text>
      </Pressable>
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 48,
    textAlign: 'center',
  },
  checkingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

