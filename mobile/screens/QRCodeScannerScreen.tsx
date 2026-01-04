import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { QRCodeValidator } from '../services/QRCodeValidator';
import { QRCodeData } from '../types/cabin';

interface QRCodeScannerScreenProps {
  onQRCodeScanned: (data: QRCodeData) => void;
}

export const QRCodeScannerScreen: React.FC<QRCodeScannerScreenProps> = ({
  onQRCodeScanned,
}) => {
  const { setCabineId, setBluetoothDeviceName, setIsMockMode } = useGame();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);

  useEffect(() => {
    checkCameraAvailability();
  }, []);

  const checkCameraAvailability = async () => {
    try {
      // Tentar importar a câmera dinamicamente
      // TODO: Instalar expo-camera: npx expo install expo-camera
      // const { Camera } = require('expo-camera');
      // const { status } = await Camera.requestCameraPermissionsAsync();
      // setHasPermission(status === 'granted');
      // setCameraAvailable(true);

      // Por enquanto, sem câmera instalada
      setCameraAvailable(false);
      console.log('[QRCodeScanner] Câmera não disponível. Use modo mock para testes.');
    } catch (error) {
      console.log('[QRCodeScanner] expo-camera não instalado');
      setCameraAvailable(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    
    // Vibração feedback
    if (Platform.OS !== 'web') {
      Vibration.vibrate(200);
    }

    console.log('[QRCodeScanner] QR Code escaneado:', data);

    // Validar QR Code
    const { data: qrData, error } = QRCodeValidator.validate(data);

    if (error) {
      console.error('[QRCodeScanner] QR Code inválido:', error);
      Alert.alert(
        'QR Code Inválido',
        error.message,
        [
          {
            text: 'Tentar Novamente',
            onPress: () => setScanned(false),
          },
        ]
      );
      return;
    }

    if (!qrData) {
      Alert.alert(
        'Erro',
        'Não foi possível ler o QR Code',
        [
          {
            text: 'Tentar Novamente',
            onPress: () => setScanned(false),
          },
        ]
      );
      return;
    }

    // Salvar dados no contexto
    console.log('[QRCodeScanner] QR Code válido:', qrData);
    setCabineId(qrData.cabinId);
    setBluetoothDeviceName(qrData.bluetoothName);
    setIsMockMode(false);

    // Navegar para próxima tela
    onQRCodeScanned(qrData);
  };

  const handleMockQRCode = () => {
    console.log('[QRCodeScanner] Usando modo MOCK');

    Alert.alert(
      'Modo Mock',
      'Deseja usar uma cabine mock para testes?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cabine DEV (999)',
          onPress: () => useMockCabin(999),
        },
        {
          text: 'Cabine Aleatória',
          onPress: () => useMockCabin(),
        },
      ]
    );
  };

  const useMockCabin = (cabinId?: number) => {
    const mockData = QRCodeValidator.generateMockData(cabinId);
    
    console.log('[QRCodeScanner] Mock QR Code gerado:', mockData);
    
    // Salvar dados no contexto
    setCabineId(mockData.cabinId);
    setBluetoothDeviceName(mockData.bluetoothName);
    setIsMockMode(true);

    // Feedback visual
    if (Platform.OS !== 'web') {
      Vibration.vibrate([100, 50, 100]);
    }

    // Navegar para próxima tela
    setTimeout(() => {
      onQRCodeScanned(mockData);
    }, 500);
  };

  // Se câmera não disponível, mostrar apenas opção de mock
  if (!cameraAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>📱 Escanear Cabine</Text>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Câmera não disponível</Text>
            <Text style={styles.warningText}>
              Para usar o scanner de QR Code, instale a dependência:
            </Text>
            <Text style={styles.codeText}>npx expo install expo-camera</Text>
            <Text style={styles.warningText}>
              Por enquanto, use o modo mock para testar.
            </Text>
          </View>

          <Pressable style={styles.mockButton} onPress={handleMockQRCode}>
            <Text style={styles.mockButtonText}>🧪 Usar Modo Mock</Text>
          </Pressable>

          <Text style={styles.hint}>
            O modo mock simula o scan de um QR Code{'\n'}
            sem precisar de hardware real
          </Text>
        </View>
      </View>
    );
  }

  // Se câmera disponível mas sem permissão
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Solicitando permissão da câmera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>❌ Permissão Negada</Text>
          <Text style={styles.subtitle}>
            Não é possível acessar a câmera.{'\n'}
            Permita o acesso nas configurações do app.
          </Text>

          <Pressable style={styles.mockButton} onPress={handleMockQRCode}>
            <Text style={styles.mockButtonText}>🧪 Usar Modo Mock</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Se câmera disponível e com permissão
  // TODO: Implementar quando expo-camera estiver instalado
  return (
    <View style={styles.container}>
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraPlaceholderText}>
          [CÂMERA AQUI]
        </Text>
        <Text style={styles.subtitle}>
          Instale expo-camera para usar
        </Text>
      </View>

      {scanned && (
        <Pressable
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.rescanButtonText}>Escanear Novamente</Text>
        </Pressable>
      )}

      <View style={styles.bottomControls}>
        <Pressable style={styles.mockButtonSmall} onPress={handleMockQRCode}>
          <Text style={styles.mockButtonSmallText}>🧪 Mock</Text>
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
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  warningTitle: {
    color: '#92400e',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  warningText: {
    color: '#78350f',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  codeText: {
    backgroundColor: '#fde68a',
    color: '#78350f',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  mockButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  mockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  mockButtonSmall: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  mockButtonSmallText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  cameraPlaceholder: {
    width: 300,
    height: 300,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  cameraPlaceholderText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  rescanButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 16,
  },
});

