import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';

interface BluetoothConnectionErrorScreenProps {
  error: string;
  bluetoothDeviceName?: string;
  onTryAgain: () => void;
  onUseMockMode: () => void;
  onBackToLobby: () => void;
}

export const BluetoothConnectionErrorScreen: React.FC<BluetoothConnectionErrorScreenProps> = ({
  error,
  bluetoothDeviceName,
  onTryAgain,
  onUseMockMode,
  onBackToLobby,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.errorIcon}>⚠️</Text>
        
        <Text style={styles.title}>Falha na Conexão</Text>
        
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Erro de Bluetooth</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          {bluetoothDeviceName && (
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Dispositivo:</Text>
              <Text style={styles.deviceName}>{bluetoothDeviceName}</Text>
            </View>
          )}
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>💡 O que fazer?</Text>
          <Text style={styles.helpText}>
            • Certifique-se que está próximo à cabine{'\n'}
            • Verifique se o Bluetooth está ligado{'\n'}
            • Certifique-se que a cabine está ligada{'\n'}
            • Tente novamente em alguns segundos
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={onTryAgain}>
          <Text style={styles.primaryButtonText}>🔄 Tentar Novamente</Text>
        </Pressable>

        <Pressable style={styles.mockButton} onPress={onUseMockMode}>
          <Text style={styles.mockButtonText}>🧪 Continuar em Modo Mock</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={onBackToLobby}>
          <Text style={styles.backButtonText}>← Voltar ao Lobby</Text>
        </Pressable>
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
    width: '100%',
  },
  errorIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#1f2937',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  deviceInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  deviceLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  deviceName: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  helpBox: {
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  helpTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  helpText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  mockButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  mockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
});

