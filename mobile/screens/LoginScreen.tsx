import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AuthService } from '../services/AuthService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!nickname.trim()) {
      Alert.alert('Erro', 'Digite um nickname');
      return;
    }

    setLoading(true);
    try {
      await AuthService.login(nickname);
      onLoginSuccess();
    } catch (error) {
      Alert.alert('Erro', `Falha no login: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RodaRico</Text>
      <Text style={styles.subtitle}>Jogo de Desarme de Bomba</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite seu nickname"
        placeholderTextColor="#9ca3af"
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="none"
        editable={!loading}
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 48,
  },
  input: {
    width: '100%',
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
    width: '100%',
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
});

