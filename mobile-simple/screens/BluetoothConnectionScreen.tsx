import React, { useState } from 'react';
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
import { TARGET_DEVICE_NAME } from '../constants/bluetooth';
import { PERMISSIONS, requestMultiple, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

interface BluetoothConnectionScreenProps {
  onConnected: () => void;
}

export const BluetoothConnectionScreen: React.FC<BluetoothConnectionScreenProps> = ({
  onConnected,
}) => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusText, setStatusText] = useState('');

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const perms = Platform.OS === 'android'
        ? [
            PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
            PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          ]
        : [PERMISSIONS.IOS.LOCATION_WHEN_IN_USE];

      const result = await requestMultiple(perms);
      const denied = Object.entries(result).filter(
        ([, v]) => v !== RESULTS.GRANTED && v !== RESULTS.LIMITED
      );

      if (denied.length) {
        Alert.alert(
          'Permissões necessárias',
          'Conceda permissões de Bluetooth e Localização para usar o app.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões', error);
      return false;
    }
  };

  const handleScan = async () => {
    const ok = await requestPermissions();
    if (!ok) return;

    setDevices([]);
    setIsScanning(true);
    setStatusText(`Procurando dispositivos "${TARGET_DEVICE_NAME}"...`);

    const stopScan = await bluetoothService.scanForDevices((device) => {
      setDevices((prev) => {
        const existing = prev.find((d) => d.id === device.id);
        if (existing) return prev;

        const deviceName = device.name.toLowerCase();
        const targetName = TARGET_DEVICE_NAME.toLowerCase();

        if (!deviceName.includes(targetName)) {
          return prev;
        }

        console.log(`Dispositivo "${TARGET_DEVICE_NAME}" encontrado: ${device.name}`);
        return [...prev, device].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
      });
    });

    setTimeout(() => {
      stopScan();
      setIsScanning(false);
      setStatusText(
        devices.length > 0
          ? `${devices.length} dispositivo(s) encontrado(s)`
          : `Nenhum dispositivo "${TARGET_DEVICE_NAME}" encontrado`
      );
    }, 10000);
  };

  const handleConnect = async (device: Device) => {
    console.log('Tentando conectar ao dispositivo:', device.name, device.id);
    setIsConnecting(true);
    setStatusText(`Conectando a ${device.name}...`);

    try {
      await bluetoothService.connectToDevice(device);
      console.log('Conectado com sucesso!');
      setStatusText('Conectado!');
      setTimeout(onConnected, 300);
    } catch (error) {
      console.error('Erro ao conectar:', error);
      Alert.alert('Erro', `Falha ao conectar: ${error}`);
      setStatusText('Falha na conexão');
      setIsConnecting(false);
    }
  };

  const handleMockMode = () => {
    bluetoothService.enableMockMode();
    onConnected();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RodaRico - Controle</Text>
      <Text style={styles.subtitle}>Conecte ao dispositivo "{TARGET_DEVICE_NAME}"</Text>

      {!isScanning && !isConnecting && (
        <>
          <Pressable style={styles.primaryButton} onPress={handleScan}>
            <Text style={styles.buttonText}>Procurar Dispositivos</Text>
          </Pressable>
          
          {devices.length > 0 && (
            <Pressable style={styles.refreshButton} onPress={handleScan}>
              <Text style={styles.refreshButtonText}>🔄 Resfriar</Text>
            </Pressable>
          )}
        </>
      )}

      {isScanning && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Procurando...</Text>
        </View>
      )}

      <Text style={styles.status}>{statusText}</Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.deviceItem,
              isConnecting && styles.deviceItemDisabled
            ]}
            onPress={() => {
              console.log('Clicou no dispositivo:', item.name);
              handleConnect(item.device);
            }}
            disabled={isConnecting}
          >
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceMeta}>RSSI: {item.rssi ?? 'N/A'}</Text>
            </View>
            {!isConnecting && (
              <Text style={styles.connectArrow}>→</Text>
            )}
            {isConnecting && (
              <ActivityIndicator size="small" color="#3b82f6" />
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          !isScanning ? (
            <Text style={styles.empty}>
              Nenhum dispositivo encontrado
            </Text>
          ) : null
        }
      />

      <Pressable style={styles.mockButton} onPress={handleMockMode}>
        <Text style={styles.mockButtonText}>Modo Teste (Mock)</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
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
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  status: {
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    minHeight: 20,
  },
  list: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceMeta: {
    color: '#9ca3af',
    fontSize: 12,
  },
  connectArrow: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '600',
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
  },
  refreshButton: {
    backgroundColor: '#1f2937',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  refreshButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mockButton: {
    backgroundColor: '#6b7280',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  mockButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

