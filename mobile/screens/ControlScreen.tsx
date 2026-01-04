/**
 * Tela principal de controle com botões de estímulos Bluetooth
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bluetoothService } from '../services/BluetoothService';
import { Button } from '../components/Button';
import { StatusIndicator } from '../components/StatusIndicator';
import { BLUETOOTH_COMMANDS, COMMAND_LABELS, COMMAND_COLORS } from '../constants/bluetooth';
import { COLORS } from '../constants/app';
import type { BluetoothCommand } from '../types/bluetooth';

export const ControlScreen: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastCommand, setLastCommand] = useState<BluetoothCommand | null>(null);

  useEffect(() => {
    // Verificar status inicial
    setIsConnected(bluetoothService.isConnected());

    // Listener para mudanças de conexão
    const unsubscribe = bluetoothService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  const handleCommand = async (command: BluetoothCommand) => {
    if (!isConnected && !bluetoothService.isMockModeEnabled()) {
      Alert.alert(
        'Não conectado',
        'Conecte-se ao dispositivo Bomba antes de enviar comandos.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSending(true);
    setLastCommand(command);

    try {
      await bluetoothService.sendCommand(command);
      // Comando enviado com sucesso
    } catch (error) {
      Alert.alert(
        'Erro',
        `Falha ao enviar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const getStatus = (): 'connected' | 'disconnected' | 'error' => {
    if (isConnected) return 'connected';
    if (bluetoothService.isMockModeEnabled()) return 'connected';
    return 'disconnected';
  };

  const commands: BluetoothCommand[] = [
    BLUETOOTH_COMMANDS.INICIAR,
    BLUETOOTH_COMMANDS.DESARMAR,
    BLUETOOTH_COMMANDS.ACELERAR,
    BLUETOOTH_COMMANDS.EXPLODIR,
    BLUETOOTH_COMMANDS.REINICIAR,
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Controle Bomba</Text>
          <Text style={styles.subtitle}>Envie comandos para o dispositivo</Text>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusSection}>
          <StatusIndicator
            status={getStatus()}
            message={
              isConnected
                ? 'Conectado ao dispositivo Bomba'
                : bluetoothService.isMockModeEnabled()
                ? 'Modo de teste ativo'
                : 'Desconectado'
            }
          />
        </View>

        {/* Comandos */}
        <View style={styles.commandsSection}>
          <Text style={styles.sectionTitle}>Comandos Disponíveis</Text>
          
          {commands.map((command) => {
            const isLastCommand = lastCommand === command;
            const buttonVariant = isLastCommand ? 'success' : 'primary';
            
            return (
              <Button
                key={command}
                title={COMMAND_LABELS[command]}
                onPress={() => handleCommand(command)}
                variant={buttonVariant as any}
                disabled={isSending || (!isConnected && !bluetoothService.isMockModeEnabled())}
                loading={isSending && isLastCommand}
                fullWidth
                style={[
                  styles.commandButton,
                  { backgroundColor: isLastCommand ? COMMAND_COLORS[command] : undefined },
                ]}
              />
            );
          })}
        </View>

        {/* Informações */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {bluetoothService.isMockModeEnabled()
              ? '⚠️ Modo de teste: comandos serão simulados'
              : isConnected
              ? '✓ Conectado e pronto para enviar comandos'
              : '⚠️ Conecte-se ao dispositivo Bomba para enviar comandos'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statusSection: {
    marginBottom: 32,
  },
  commandsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  commandButton: {
    marginBottom: 12,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});




