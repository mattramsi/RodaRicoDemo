import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { bluetoothService, BluetoothDevice } from '../services/BluetoothService';
import { PERMISSIONS, requestMultiple, openSettings, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

interface BluetoothConnectionScreenProps {
  onConnected: () => void;
  onSkip: () => void;
}

export const BluetoothConnectionScreen: React.FC<BluetoothConnectionScreenProps> = ({
  onConnected,
  onSkip,
}) => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const unsubscribe = bluetoothService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        setStatusText('Conectado');
        setIsConnecting(false);
      }
    });

    return unsubscribe;
  }, []);

  const ensurePermissions = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const perms = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        ];
        const result = await requestMultiple(perms);
        const denied = Object.entries(result).filter(
          ([, v]) => v !== RESULTS.GRANTED && v !== RESULTS.LIMITED
        );
        if (denied.length) {
          Alert.alert(
            'Permissões necessárias',
            'Conceda permissões de Bluetooth e Localização para usar o app.',
            [
              { text: 'Abrir Ajustes', onPress: () => openSettings() },
              { text: 'OK' },
            ]
          );
          return false;
        }
      } else {
        const perms = [
          PERMISSIONS.IOS.BLUETOOTH,
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ];
        const result = await requestMultiple(perms);
        const denied = Object.entries(result).filter(
          ([, v]) => v !== RESULTS.GRANTED && v !== RESULTS.LIMITED
        );
        if (denied.length) {
          Alert.alert(
            'Permissões necessárias',
            'Conceda permissão de Bluetooth para usar o app.',
            [
              { text: 'Abrir Ajustes', onPress: () => openSettings() },
              { text: 'OK' },
            ]
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões', error);
      Alert.alert('Erro', 'Falha ao solicitar permissões');
      return false;
    }
  }, []);

  const handleScan = async () => {
    console.log('=== INICIANDO SCAN ===');
    const ok = await ensurePermissions();
    if (!ok) {
      console.log('Permissões negadas');
      return;
    }

    setDevices([]);
    setIsScanning(true);
    setStatusText('Escaneando dispositivos...');

    const stopScan = await bluetoothService.scanForDevices((device) => {
      console.log('Dispositivo encontrado:', device.name, device.id);
      setDevices((prev) => {
        const existing = prev.find((d) => d.id === device.id);
        if (existing) {
          console.log('Dispositivo já na lista:', device.id);
          return prev;
        }
        console.log('Adicionando dispositivo à lista:', device.name);
        const newList = [...prev, device].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
        console.log('Total de dispositivos na lista:', newList.length);
        return newList;
      });
    });

    // Auto stop after 10 seconds
    setTimeout(() => {
      console.log('Parando scan após 10 segundos');
      stopScan();
      setIsScanning(false);
      setStatusText('Scan concluído');
    }, 10000);
  };

  const handleConnect = async (device: Device) => {
    console.log('=== INICIANDO CONEXÃO ===');
    console.log('Device name:', device.name);
    console.log('Device id:', device.id);
    console.log('Device object:', device);
    
    setIsConnecting(true);
    setStatusText(`Conectando a ${device.name || device.id}...`);

    try {
      console.log('Chamando bluetoothService.connectToDevice...');
      await bluetoothService.connectToDevice(device);
      console.log('Conexão estabelecida com sucesso!');
      setStatusText('Conectado com sucesso!');
      setTimeout(() => {
        console.log('Chamando onConnected()');
        onConnected();
      }, 500);
    } catch (error) {
      console.error('Erro ao conectar:', error);
      Alert.alert('Erro', `Falha ao conectar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setStatusText('Falha na conexão');
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    bluetoothService.enableMockMode();
    onSkip();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conectar à Cabine</Text>
      <Text style={styles.subtitle}>Vincule o app ao dispositivo físico da cabine</Text>

      {!isScanning && !isConnected && (
        <Pressable style={styles.primaryButton} onPress={handleScan}>
          <Text style={styles.primaryButtonText}>Procurar dispositivos</Text>
        </Pressable>
      )}

      {isScanning && (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.scanningText}>Procurando dispositivos...</Text>
        </View>
      )}

      <Text style={styles.status}>{statusText}</Text>

      {isConnected && (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>✓ Conectado</Text>
        </View>
      )}

      {!isConnected && (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          style={styles.deviceList}
          contentContainerStyle={styles.deviceListContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.deviceItem,
                pressed && styles.deviceItemPressed,
                isConnecting && styles.deviceItemDisabled,
              ]}
              onPress={() => {
                console.log('Device pressed:', item.name, item.id);
                handleConnect(item.device);
              }}
              disabled={isConnecting}
            >
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceName}>{item.name}</Text>
                {!isConnecting && <Text style={styles.tapHint}>👆 Toque para conectar</Text>}
              </View>
              <Text style={styles.deviceMeta}>ID: {item.id}</Text>
              <Text style={styles.deviceMeta}>RSSI: {item.rssi ?? 'N/A'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            !isScanning ? (
              <Text style={styles.empty}>Nenhum dispositivo encontrado</Text>
            ) : null
          }
        />
      )}

      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Pular conexão (teste)</Text>
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
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanningContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scanningText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  status: {
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    minHeight: 20,
  },
  connectedContainer: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectedText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingVertical: 8,
  },
  deviceItem: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  deviceItemPressed: {
    backgroundColor: '#1e293b',
    borderColor: '#60a5fa',
  },
  deviceItemDisabled: {
    opacity: 0.5,
    borderColor: '#6b7280',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  tapHint: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  deviceMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
  },
  skipButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

