import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { PERMISSIONS, checkMultiple, RESULTS, Permission } from 'react-native-permissions';
import { Platform, Linking } from 'react-native';

interface BluetoothBlockedScreenProps {
  onPermissionGranted: () => void;
}

export const BluetoothBlockedScreen: React.FC<BluetoothBlockedScreenProps> = ({
  onPermissionGranted,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Verificar permissões periodicamente quando o app volta do background
    const interval = setInterval(() => {
      checkPermissions();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const checkPermissions = async () => {
    setIsChecking(true);
    
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
        // A permissão de Localização é necessária para escanear dispositivos Bluetooth
        permissions = [
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ];
      }

      const results = await checkMultiple(permissions);
      const allGranted = Object.values(results).every(
        (result) => result === RESULTS.GRANTED || result === RESULTS.LIMITED
      );

      if (allGranted) {
        onPermissionGranted();
      }
    } catch (error) {
      console.error('Erro ao verificar permissões', error);
    } finally {
      setIsChecking(false);
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🚫</Text>
      </View>
      
Previous preparation error: The developer disk image could not be mounted on this device.; Error mounting image: 0xe800010f (kAMDMobileImageMounterPersonalizedBundleMissingVariantError: The bundle image is missing the requested variant for this device.)      <Text style={styles.title}>Permissão Necessária</Text>
      
      <Text style={styles.description}>
        {Platform.OS === 'ios'
          ? 'Este aplicativo não pode funcionar sem a permissão de Localização (necessária para Bluetooth).'
          : 'Este aplicativo não pode funcionar sem a permissão de Bluetooth.'}
      </Text>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Ação Necessária</Text>
        <Text style={styles.warningText}>
          Para continuar usando o app, você precisa:{'\n\n'}
          1. Abrir as Configurações do dispositivo{'\n'}
          2. Encontrar este aplicativo na lista{'\n'}
          3. Ativar a permissão de {Platform.OS === 'ios' ? 'Localização' : 'Bluetooth'}{'\n'}
          4. Voltar ao aplicativo
        </Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={openSettings}
      >
        <Text style={styles.primaryButtonText}>Abrir Configurações</Text>
      </Pressable>

      <Text style={styles.hintText}>
        Após conceder a permissão, o app será atualizado automaticamente
      </Text>
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
  warningBox: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  warningTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  warningText: {
    color: '#fca5a5',
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
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  hintText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

