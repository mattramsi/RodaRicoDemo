import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { PERMISSIONS, requestMultiple, checkMultiple, RESULTS, Permission } from 'react-native-permissions';
import { Platform, Linking } from 'react-native';

interface BluetoothPermissionScreenProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export const BluetoothPermissionScreen: React.FC<BluetoothPermissionScreenProps> = ({
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      let permissions: Permission[] = [];
      
      if (Platform.OS === 'android') {
        permissions = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];
      } else {
        // iOS: No iOS 13+, não há permissão explícita de Bluetooth
        // A permissão de Localização é necessária para escanear dispositivos
        permissions = [
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ];
      }

      const results = await checkMultiple(permissions);
      console.log('Resultados da verificação de permissões:', results);
      
      const allGranted = Object.values(results).every(
        (result) => result === RESULTS.GRANTED || result === RESULTS.LIMITED
      );

      setIsChecking(false);

      if (allGranted) {
        console.log('Permissões já concedidas, redirecionando...');
        onPermissionGranted();
      } else {
        console.log('Permissões não concedidas, mostrando tela de solicitação');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões', error);
      setIsChecking(false);
    }
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    
    try {
      let permissions: Permission[] = [];
      
      if (Platform.OS === 'android') {
        permissions = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];
      } else {
        // iOS: No iOS 13+, não há permissão explícita de Bluetooth
        // A permissão de Localização é necessária para escanear dispositivos
        permissions = [
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ];
      }

      console.log('Solicitando permissões:', permissions);
      const results = await requestMultiple(permissions);
      console.log('Resultados da solicitação de permissões:', results);
      
      const denied = Object.entries(results).filter(
        ([, result]) => result !== RESULTS.GRANTED && result !== RESULTS.LIMITED
      );

      setIsRequesting(false);

      if (denied.length === 0) {
        console.log('Todas as permissões concedidas');
        onPermissionGranted();
      } else {
        console.log('Algumas permissões foram negadas:', denied);
        // Verificar se foi bloqueado permanentemente
        const blocked = Object.entries(results).some(
          ([, result]) => result === RESULTS.BLOCKED
        );
        
        if (blocked) {
          console.log('Permissões bloqueadas permanentemente');
          onPermissionDenied();
        } else {
          console.log('Permissões negadas, mas ainda pode tentar novamente');
          onPermissionDenied();
        }
      }
    } catch (error) {
      console.error('Erro ao solicitar permissões', error);
      setIsRequesting(false);
      onPermissionDenied();
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.checkingText}>Verificando permissões...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📶</Text>
      </View>
      
      <Text style={styles.title}>Permissão Necessária</Text>
      
      <Text style={styles.description}>
        {Platform.OS === 'ios' 
          ? 'Para usar este aplicativo, precisamos da permissão de Localização para conectar aos dispositivos Bluetooth da cabine.'
          : 'Para usar este aplicativo, precisamos da permissão de Bluetooth para conectar aos dispositivos da cabine.'}
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {Platform.OS === 'ios' 
            ? '• O app precisa de Localização para usar Bluetooth\n• No iOS, a localização é necessária para descobrir dispositivos Bluetooth\n• Sem esta permissão, não é possível usar o aplicativo'
            : '• O app precisa de Bluetooth para funcionar\n• Sem esta permissão, não é possível usar o aplicativo'}
        </Text>
      </View>

      <Pressable
        style={[styles.primaryButton, isRequesting && styles.buttonDisabled]}
        onPress={requestPermissions}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Conceder Permissão</Text>
        )}
      </Pressable>

      <Pressable style={styles.settingsButton} onPress={openSettings}>
        <Text style={styles.settingsButtonText}>Abrir Configurações</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  checkingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

