import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { bluetoothService, BluetoothCommand } from '../services/BluetoothService';
import { BLUETOOTH_COMMANDS, COMMAND_LABELS, COMMAND_COLORS } from '../constants/bluetooth';

interface ControlScreenProps {
  onBack: () => void;
}

export const ControlScreen: React.FC<ControlScreenProps> = ({ onBack }) => {
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const handleCommand = async (command: BluetoothCommand) => {
    setIsSending(true);
    setLastCommand(`Enviando: ${COMMAND_LABELS[command]}...`);

    try {
      await bluetoothService.sendCommand(command);
      setLastCommand(`✓ ${COMMAND_LABELS[command]} enviado`);
    } catch (error) {
      Alert.alert('Erro', `Falha ao enviar comando: ${error}`);
      setLastCommand(`✗ Erro ao enviar ${COMMAND_LABELS[command]}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Desconectar',
      'Deseja desconectar do dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            await bluetoothService.disconnect();
            onBack();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Controle da Bomba</Text>
      <Text style={styles.subtitle}>Envie comandos para o dispositivo</Text>

      <View style={styles.statusContainer}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Conectado</Text>
      </View>

      {lastCommand ? (
        <Text style={styles.lastCommand}>{lastCommand}</Text>
      ) : null}

      <View style={styles.buttonsContainer}>
        <Pressable
          style={[
            styles.commandButton,
            { backgroundColor: COMMAND_COLORS.INICIAR },
            isSending && styles.buttonDisabled,
          ]}
          onPress={() => handleCommand(BLUETOOTH_COMMANDS.INICIAR)}
          disabled={isSending}
        >
          <Text style={styles.commandButtonText}>
            {COMMAND_LABELS.INICIAR}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.commandButton,
            { backgroundColor: COMMAND_COLORS.DESARMAR },
            isSending && styles.buttonDisabled,
          ]}
          onPress={() => handleCommand(BLUETOOTH_COMMANDS.DESARMAR)}
          disabled={isSending}
        >
          <Text style={styles.commandButtonText}>
            {COMMAND_LABELS.DESARMAR}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.commandButton,
            { backgroundColor: COMMAND_COLORS.ACELERAR },
            isSending && styles.buttonDisabled,
          ]}
          onPress={() => handleCommand(BLUETOOTH_COMMANDS.ACELERAR)}
          disabled={isSending}
        >
          <Text style={styles.commandButtonText}>
            {COMMAND_LABELS.ACELERAR}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.commandButton,
            { backgroundColor: COMMAND_COLORS.EXPLODIR },
            isSending && styles.buttonDisabled,
          ]}
          onPress={() => handleCommand(BLUETOOTH_COMMANDS.EXPLODIR)}
          disabled={isSending}
        >
          <Text style={styles.commandButtonText}>
            {COMMAND_LABELS.EXPLODIR}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.commandButton,
            { backgroundColor: COMMAND_COLORS.REINICIAR },
            isSending && styles.buttonDisabled,
          ]}
          onPress={() => handleCommand(BLUETOOTH_COMMANDS.REINICIAR)}
          disabled={isSending}
        >
          <Text style={styles.commandButtonText}>
            {COMMAND_LABELS.REINICIAR}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.backButton} onPress={handleDisconnect}>
        <Text style={styles.backButtonText}>← Voltar e Desconectar</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  lastCommand: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    minHeight: 20,
  },
  buttonsContainer: {
    gap: 12,
  },
  commandButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  commandButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});

