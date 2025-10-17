import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BleManager, Characteristic, Device } from 'react-native-ble-plx';
import { PERMISSIONS, requestMultiple, openSettings, RESULTS } from 'react-native-permissions';
import { encode as base64Encode } from 'base-64';

type DiscoveredDevice = {
  id: string;
  name: string;
  rssi: number | null;
  device: Device;
};

export default function App() {
  const managerRef = useRef<BleManager | null>(null);
  const scanSubscriptionRef = useRef<ReturnType<BleManager['startDeviceScan']> | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Map<string, DiscoveredDevice>>(new Map());
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [writableCharacteristic, setWritableCharacteristic] = useState<Characteristic | undefined>(undefined);
  const [statusText, setStatusText] = useState<string>('');
  const [negotiatedMtu, setNegotiatedMtu] = useState<number | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspection, setInspection] = useState<Array<{ serviceUUID: string; characteristics: Array<{ uuid: string; flags: string[] }> }>>([]);
  const [selectedServiceUUID, setSelectedServiceUUID] = useState<string | undefined>(undefined);
  const [selectedCharUUID, setSelectedCharUUID] = useState<string | undefined>(undefined);

  // Alvos opcionais: defina se seu periférico exigir UUIDs específicos
  // ex.: const TARGET_SERVICE_UUID = 'd0611e78-bbb4-4591-a5f8-487910ae4366';
  // ex.: const TARGET_WRITE_CHAR_UUID = '8667556c-9a37-4c91-84ed-54ee27d90049';
  const TARGET_SERVICE_UUID: string | undefined = undefined;
  const TARGET_WRITE_CHAR_UUID: string | undefined = undefined;
  const PREFERRED_MTU = 185; // Android apenas

  const sleep = useCallback((ms: number) => new Promise((r) => setTimeout(r, ms)), []);
  const equalsUuid = useCallback((a?: string | null, b?: string | null) =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase(), []);

  const pickWritableCharacteristic = useCallback(async (deviceId: string): Promise<Characteristic | undefined> => {
    if (!managerRef.current) return undefined;
    try {
      // Tentar alvos específicos primeiro
      if (TARGET_SERVICE_UUID) {
        const chars = await managerRef.current.characteristicsForDevice(deviceId, TARGET_SERVICE_UUID);
        let candidate = chars.find((ch) => equalsUuid(ch.uuid, TARGET_WRITE_CHAR_UUID) && (ch.isWritableWithoutResponse || ch.isWritableWithResponse));
        if (candidate) return candidate;
        candidate = chars.find((ch) => ch.isWritableWithoutResponse || ch.isWritableWithResponse);
        if (candidate) return candidate;
      }

      // Varrer services, priorizando writeWithoutResponse
      const services = await managerRef.current.servicesForDevice(deviceId);
      let best: Characteristic | undefined = undefined;
      for (const svc of services) {
        if (TARGET_SERVICE_UUID && !equalsUuid(svc.uuid, TARGET_SERVICE_UUID)) continue;
        const chars = await managerRef.current.characteristicsForDevice(deviceId, svc.uuid);
        const noResp = chars.find((ch) => ch.isWritableWithoutResponse);
        if (noResp) return noResp;
        const withResp = chars.find((ch) => ch.isWritableWithResponse);
        if (withResp && !best) best = withResp;
      }
      return best;
    } catch (err) {
      console.error('Falha ao escolher characteristic gravável', err);
      return undefined;
    }
  }, [equalsUuid, TARGET_SERVICE_UUID, TARGET_WRITE_CHAR_UUID]);

  useEffect(() => {
    managerRef.current = new BleManager();
    return () => {
      try {
        if (scanSubscriptionRef.current) {
          managerRef.current?.stopDeviceScan();
        }
        managerRef.current?.destroy();
      } catch (error) {
        // no-op
      }
    };
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
        const denied = Object.entries(result).filter(([, v]) => v !== RESULTS.GRANTED && v !== RESULTS.LIMITED);
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
        const denied = Object.entries(result).filter(([, v]) => v !== RESULTS.GRANTED && v !== RESULTS.LIMITED);
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

  // Solicitar permissões assim que o app iniciar
  useEffect(() => {
    ensurePermissions();
  }, [ensurePermissions]);

  const startScan = useCallback(async () => {
    const ok = await ensurePermissions();
    if (!ok) return;
    if (!managerRef.current) return;
    setDevices(new Map());
    setIsScanning(true);
    setStatusText('Escaneando dispositivos...');
    try {
      managerRef.current.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Erro no scan:', error);
            setStatusText(`Erro no scan: ${String(error?.message || error)}`);
            setIsScanning(false);
            managerRef.current?.stopDeviceScan();
            return;
          }
          if (!device) return;
          const name = device.name || device.localName || 'Sem nome';
          setDevices(prev => {
            const next = new Map(prev);
            next.set(device.id, {
              id: device.id,
              name,
              rssi: device.rssi ?? null,
              device,
            });
            return next;
          });
        }
      );
    } catch (e) {
      console.error('Falha ao iniciar scan', e);
      Alert.alert('Erro', 'Falha ao iniciar o scan BLE');
      setIsScanning(false);
    }
  }, [ensurePermissions]);

  const stopScan = useCallback(() => {
    try {
      managerRef.current?.stopDeviceScan();
    } catch (e) {
      // no-op
    }
    setIsScanning(false);
    setStatusText('Scan interrompido');
  }, []);

  const connectTo = useCallback(async (device: Device) => {
    if (!managerRef.current) return;
    try {
      stopScan();
      setStatusText(`Conectando a ${device.name || device.id}...`);
      const connected = await managerRef.current.connectToDevice(device.id, { autoConnect: false });
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      // Pequeno delay: alguns firmwares precisam de tempo após discover
      await sleep(200);

      // Negociar MTU no Android (amplia tamanho de pacote)
      if (Platform.OS === 'android') {
        try {
          const afterMtu = await discovered.requestMTU(PREFERRED_MTU);
          setNegotiatedMtu(afterMtu.mtu ?? null);
          console.log('MTU negociado:', afterMtu.mtu);
        } catch (e) {
          console.warn('Falha ao negociar MTU (Android)', e);
        }
      }

      setConnectedDevice(discovered);
      setStatusText('Descobrindo services/characteristics...');

      const writable = await pickWritableCharacteristic(discovered.id);

      if (!writable) {
        console.error('Nenhuma characteristic gravável encontrada');
        Alert.alert(
          'Conectado, mas sem characteristic gravável',
          'Não foi possível localizar uma characteristic com escrita. Verifique o dispositivo/UUIDs.'
        );
        setStatusText('Conectado (sem characteristic gravável)');
      } else {
        setWritableCharacteristic(writable);
        setStatusText(`Conectado a ${discovered.name || discovered.id}`);
        console.log('Characteristic selecionada:', writable.serviceUUID, writable.uuid);
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      Alert.alert('Erro', 'Falha ao conectar ao dispositivo BLE');
      setConnectedDevice(null);
      setWritableCharacteristic(undefined);
      setStatusText('Falha na conexão');
    }
  }, [stopScan]);

  const disconnect = useCallback(async () => {
    if (!connectedDevice || !managerRef.current) return;
    try {
      await managerRef.current.cancelDeviceConnection(connectedDevice.id);
    } catch (e) {
      console.error('Erro ao desconectar', e);
    }
    setConnectedDevice(null);
    setWritableCharacteristic(undefined);
    setStatusText('Desconectado');
  }, [connectedDevice]);

  const sendCommand = useCallback(async (commandLabel: string) => {
    if (!connectedDevice || !writableCharacteristic || !managerRef.current) {
      Alert.alert('Sem conexão', 'Conecte-se a um dispositivo antes de enviar comandos.');
      return;
    }
    try {
      const payloadUtf8 = commandLabel; // ajuste conforme protocolo do periférico
      const writeChunk = async (chunk: string, preferNoResp: boolean) => {
        const b64 = base64Encode(chunk);
        if (preferNoResp && writableCharacteristic.isWritableWithoutResponse) {
          await managerRef.current!.writeCharacteristicWithoutResponseForDevice(
            connectedDevice.id,
            writableCharacteristic.serviceUUID!,
            writableCharacteristic.uuid,
            b64
          );
          return;
        }
        await managerRef.current!.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          writableCharacteristic.serviceUUID!,
          writableCharacteristic.uuid,
          b64
        );
      };

      // Tamanho seguro de chunk (20 bytes). Pode usar (negotiatedMtu - 3) quando disponível
      const chunkSize = 20;
      const chunks: string[] = [];
      for (let i = 0; i < payloadUtf8.length; i += chunkSize) {
        chunks.push(payloadUtf8.slice(i, i + chunkSize));
      }

      setStatusText(`Enviando: ${commandLabel}`);
      for (const chunk of chunks) {
        try {
          await writeChunk(chunk, true);
        } catch (errFirst) {
          console.warn('Falha write sem resposta, tentando com resposta', errFirst);
          await sleep(50);
          await writeChunk(chunk, false);
        }
        await sleep(20);
      }

      setStatusText(`Comando enviado: ${commandLabel}`);
      console.log(`Comando '${commandLabel}' enviado com sucesso`);
    } catch (error) {
      console.error('Erro ao enviar comando', error);
      Alert.alert('Erro', `Falha ao enviar comando: ${commandLabel}`);
      setStatusText(`Falha ao enviar: ${commandLabel}`);
    }
  }, [connectedDevice, negotiatedMtu, pickWritableCharacteristic, sleep, writableCharacteristic]);

  const deviceList = useMemo(() => Array.from(devices.values()).sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)), [devices]);

  const inspectGATT = useCallback(async () => {
    if (!connectedDevice || !managerRef.current) return;
    try {
      setIsInspecting(true);
      const services = await managerRef.current.servicesForDevice(connectedDevice.id);
      const result: Array<{ serviceUUID: string; characteristics: Array<{ uuid: string; flags: string[] }> }> = [];
      for (const svc of services) {
        const chars = await managerRef.current.characteristicsForDevice(connectedDevice.id, svc.uuid);
        const mapped = chars.map(ch => {
          const flags: string[] = [];
          if (ch.isReadable) flags.push('READ');
          if (ch.isWritableWithoutResponse) flags.push('WRITE_NR');
          if (ch.isWritableWithResponse) flags.push('WRITE_R');
          if (ch.isNotifiable) flags.push('NOTIFY');
          if (ch.isIndicatable) flags.push('INDICATE');
          return { uuid: ch.uuid, flags };
        });
        result.push({ serviceUUID: svc.uuid, characteristics: mapped });
      }
      setInspection(result);
      setStatusText('Inspeção concluída');
    } catch (e) {
      console.error('Falha ao inspecionar GATT', e);
      Alert.alert('Erro', 'Falha ao inspecionar Services/Characteristics');
    }
  }, [connectedDevice]);

  const applySelectionAsWritable = useCallback(async () => {
    if (!connectedDevice || !managerRef.current) {
      Alert.alert('Sem conexão', 'Conecte-se a um dispositivo antes de aplicar a seleção.');
      return;
    }
    if (!selectedServiceUUID) {
      Alert.alert('Seleção incompleta', 'Selecione um Service para aplicar.');
      return;
    }
    try {
      const chars = await managerRef.current.characteristicsForDevice(connectedDevice.id, selectedServiceUUID);
      let chosen: Characteristic | undefined;
      if (selectedCharUUID) {
        chosen = chars.find(ch => ch.uuid.toLowerCase() === selectedCharUUID.toLowerCase());
        if (chosen && !(chosen.isWritableWithResponse || chosen.isWritableWithoutResponse)) {
          chosen = undefined; // não gravável
        }
      }
      if (!chosen) {
        chosen = chars.find(ch => ch.isWritableWithoutResponse) || chars.find(ch => ch.isWritableWithResponse);
      }
      if (!chosen) {
        Alert.alert('Não gravável', 'O Service selecionado não possui characteristic gravável.');
        return;
      }
      setWritableCharacteristic(chosen);
      setStatusText(`Selecionado p/ escrita: ${chosen.serviceUUID} / ${chosen.uuid}`);
      console.log('Writable definido por seleção:', chosen.serviceUUID, chosen.uuid);
    } catch (e) {
      console.error('Falha ao aplicar seleção como writable', e);
      Alert.alert('Erro', 'Falha ao aplicar a seleção');
    }
  }, [connectedDevice, managerRef, selectedCharUUID, selectedServiceUUID]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Controle BLE</Text>

      <View style={styles.row}>
        {!isScanning ? (
          <Pressable style={styles.primaryButton} onPress={startScan}>
            <Text style={styles.primaryButtonText}>Escanear</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={stopScan}>
            <Text style={styles.secondaryButtonText}>Parar</Text>
          </Pressable>
        )}

        {connectedDevice ? (
          <Pressable style={styles.dangerButton} onPress={disconnect}>
            <Text style={styles.dangerButtonText}>Desconectar</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.status}>{statusText}</Text>
      {connectedDevice ? (
        <Text style={styles.connectedInfo}>
          Conectado a: {connectedDevice.name || connectedDevice.id}
        </Text>
      ) : (
        <Text style={styles.connectedInfo}>Nenhum dispositivo conectado</Text>
      )}

      {!connectedDevice ? (
        <FlatList
          data={deviceList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Pressable style={styles.deviceItem} onPress={() => connectTo(item.device)}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceMeta}>{item.id}</Text>
              <Text style={styles.deviceMeta}>RSSI: {item.rssi ?? 'N/A'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum dispositivo encontrado ainda</Text>}
        />
      ) : (
        <View style={styles.commands}>
          <View style={styles.inspectionRow}>
            <Pressable style={styles.inspectButton} onPress={inspectGATT}>
              <Text style={styles.inspectButtonText}>Inspecionar UUIDs</Text>
            </Pressable>
            {inspection.length > 0 ? (
              <Pressable style={styles.clearInspectButton} onPress={() => setInspection([])}>
                <Text style={styles.clearInspectButtonText}>Limpar</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.applySelButton} onPress={applySelectionAsWritable}>
              <Text style={styles.applySelButtonText}>Aplicar seleção</Text>
            </Pressable>
          </View>

          <Pressable style={styles.cmdButton} onPress={() => sendCommand('Iniciar')}>
            <Text style={styles.cmdButtonText}>Iniciar</Text>
          </Pressable>
          <Pressable style={styles.cmdButton} onPress={() => sendCommand('Desarmar')}>
            <Text style={styles.cmdButtonText}>Desarmar</Text>
          </Pressable>
          <Pressable style={styles.cmdButton} onPress={() => sendCommand('Acelerar')}>
            <Text style={styles.cmdButtonText}>Acelerar</Text>
          </Pressable>
          <Pressable style={styles.cmdButton} onPress={() => sendCommand('Reiniciar')}>
            <Text style={styles.cmdButtonText}>Reiniciar</Text>
          </Pressable>
          <Pressable style={[styles.cmdButton, styles.explodir]} onPress={() => sendCommand('Explodir')}>
            <Text style={styles.cmdButtonText}>Explodir</Text>
          </Pressable>

          {inspection.length > 0 ? (
            <View style={styles.inspectList}>
              <Text style={styles.inspectTitle}>Services e Characteristics</Text>
              {inspection.map(sec => (
                <Pressable key={sec.serviceUUID} style={[styles.serviceBlock, selectedServiceUUID && selectedServiceUUID.toLowerCase() === sec.serviceUUID.toLowerCase() ? styles.selectedBlock : undefined]} onPress={() => { setSelectedServiceUUID(sec.serviceUUID); setSelectedCharUUID(undefined); }}>
                  <Text style={styles.serviceUuid}>Service: {sec.serviceUUID}</Text>
                  {sec.characteristics.map(c => (
                    <Pressable key={`${sec.serviceUUID}-${c.uuid}`} style={[styles.charRow, selectedCharUUID && selectedCharUUID.toLowerCase() === c.uuid.toLowerCase() ? styles.selectedRow : undefined]} onPress={() => { setSelectedServiceUUID(sec.serviceUUID); setSelectedCharUUID(c.uuid); }}>
                      <Text style={styles.charUuid}>Char: {c.uuid}</Text>
                      <Text style={styles.charFlags}>[{c.flags.join(', ')}]</Text>
                    </Pressable>
                  ))}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#a3a3a3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  status: {
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
  connectedInfo: {
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 12,
  },
  deviceItem: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  deviceName: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceMeta: {
    color: '#9ca3af',
    fontSize: 12,
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
  },
  commands: {
    gap: 12,
  },
  cmdButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cmdButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  explodir: {
    backgroundColor: '#dc2626',
  },
  inspectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  inspectButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  inspectButtonText: {
    color: '#06291f',
    fontWeight: '700',
  },
  clearInspectButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearInspectButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  inspectList: {
    marginTop: 12,
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  inspectTitle: {
    color: '#93c5fd',
    fontWeight: '700',
    marginBottom: 4,
  },
  serviceBlock: {
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 8,
  },
  serviceUuid: {
    color: '#fcd34d',
    fontWeight: '600',
    marginBottom: 6,
  },
  charRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  charUuid: {
    color: '#e5e7eb',
    flex: 1,
    marginRight: 8,
  },
  charFlags: {
    color: '#9ca3af',
  },
  applySelButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  applySelButtonText: {
    color: '#052e16',
    fontWeight: '800',
  },
  selectedBlock: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  selectedRow: {
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
});
