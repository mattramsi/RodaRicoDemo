import { BleManager, Characteristic, Device, Subscription } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { encode as base64Encode, decode as base64Decode } from 'base-64';
import type { 
  BluetoothNotification, 
  BluetoothNotificationType 
} from '../types/bluetooth';

export type BluetoothCommand = 'INICIAR' | 'DESARMAR' | 'ACELERAR' | 'EXPLODIR' | 'REINICIAR';

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number | null;
  device: Device;
}

interface QueuedCommand {
  command: BluetoothCommand;
  resolve: () => void;
  reject: (error: Error) => void;
  retries: number;
}

export type MockScenario = 'success' | 'connection_fail' | 'timeout' | 'device_not_found';

export class BluetoothService {
  private manager: BleManager | null = null;
  private connectedDevice: Device | null = null;
  private writableCharacteristic: Characteristic | undefined = undefined;
  private notifyCharacteristic: Characteristic | undefined = undefined;
  private notifySubscription: Subscription | null = null;
  private commandQueue: QueuedCommand[] = [];
  private isProcessingQueue = false;
  private isMockMode = false;
  private mockScenario: MockScenario = 'success';
  private negotiatedMtu: number | null = null;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  
  // Sistema de listeners para notificações Bluetooth
  private notificationListeners: Map<
    BluetoothNotificationType | '*',
    Set<(notification: BluetoothNotification) => void>
  > = new Map();
  
  // Timer para simular TEMPO_ATUALIZADO em modo mock
  private mockTimerInterval: NodeJS.Timeout | null = null;
  private mockSecondsRemaining: number = 600; // 10 minutos

  private readonly MAX_RETRIES = 3;
  private readonly COMMAND_TIMEOUT = 5000;
  private readonly TARGET_SERVICE_UUID: string | undefined = undefined;
  private readonly TARGET_WRITE_CHAR_UUID: string | undefined = undefined;
  private readonly TARGET_NOTIFY_CHAR_UUID: string | undefined = undefined;
  private readonly PREFERRED_MTU = 185;

  constructor() {
    this.manager = new BleManager();
    this.setupListeners();
    
    // 🧪 Ativar mock mode por padrão para desenvolvimento
    this.enableMockMode('success');
  }

  private setupListeners(): void {
    if (!this.manager) return;

    this.manager.onStateChange((state) => {
      console.log('Bluetooth state:', state);
      if (state === 'PoweredOff') {
        this.disconnect();
      }
    });
  }

  enableMockMode(scenario: MockScenario = 'success'): void {
    this.isMockMode = true;
    this.mockScenario = scenario;
    if (scenario === 'success') {
      this.notifyConnectionListeners(true);
    }
    console.log(`[BluetoothService] Mock mode enabled with scenario: ${scenario}`);
  }

  disableMockMode(): void {
    this.isMockMode = false;
    this.mockScenario = 'success';
    this.notifyConnectionListeners(false);
  }

  isMockModeEnabled(): boolean {
    return this.isMockMode;
  }

  setMockScenario(scenario: MockScenario): void {
    this.mockScenario = scenario;
    console.log(`[BluetoothService] Mock scenario changed to: ${scenario}`);
  }

  getMockScenario(): MockScenario {
    return this.mockScenario;
  }

  isConnected(): boolean {
    return this.isMockMode || (this.connectedDevice !== null && this.writableCharacteristic !== undefined);
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((cb) => cb(connected));
  }

  /**
   * Subscrever para notificações Bluetooth de um tipo específico ou todos (*)
   * @param type - Tipo de notificação ou '*' para todas
   * @param callback - Função chamada quando notificação é recebida
   * @returns Função de cleanup para remover o listener
   */
  onNotification(
    type: BluetoothNotificationType | '*',
    callback: (notification: BluetoothNotification) => void
  ): () => void {
    if (!this.notificationListeners.has(type)) {
      this.notificationListeners.set(type, new Set());
    }
    
    this.notificationListeners.get(type)!.add(callback);
    console.log(`[BluetoothService] Listener adicionado para: ${type}`);
    
    // Retorna função de cleanup
    return () => {
      this.notificationListeners.get(type)?.delete(callback);
      console.log(`[BluetoothService] Listener removido para: ${type}`);
    };
  }

  /**
   * Processar notificação recebida do ESP32 ou simulada (mock)
   */
  private handleNotification(notification: BluetoothNotification): void {
    console.log('[BluetoothService] Notificação recebida:', notification);

    // Notificar listeners específicos do tipo
    const typeListeners = this.notificationListeners.get(notification.type);
    if (typeListeners) {
      typeListeners.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error(`[BluetoothService] Erro ao chamar listener de ${notification.type}:`, error);
        }
      });
    }

    // Notificar listeners genéricos (*)
    const allListeners = this.notificationListeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('[BluetoothService] Erro ao chamar listener genérico:', error);
        }
      });
    }
  }

  /**
   * MODO MOCK: Simular notificação manualmente
   */
  simulateNotification(notification: BluetoothNotification): void {
    if (!this.isMockMode) {
      console.warn('[BluetoothService] simulateNotification só funciona em modo mock');
      return;
    }

    console.log('[BluetoothService Mock] Simulando notificação:', notification);
    this.handleNotification(notification);
  }

  /**
   * MODO MOCK: Auto-simular notificações baseadas em comandos enviados
   */
  private mockAutoNotify(command: BluetoothCommand): void {
    if (!this.isMockMode) return;

    setTimeout(() => {
      const now = Date.now();
      
      switch (command) {
        case 'INICIAR':
          // Após INICIAR, enviar timer inicial e começar contagem
          this.mockSecondsRemaining = 600; // 10 minutos
          this.simulateNotification({
            type: 'TEMPO_ATUALIZADO',
            timestamp: now,
            data: { segundosRestantes: this.mockSecondsRemaining }
          });
          this.startMockTimer();
          break;

        case 'ACELERAR':
          // Reduzir tempo em 30 segundos
          this.mockSecondsRemaining = Math.max(0, this.mockSecondsRemaining - 30);
          this.simulateNotification({
            type: 'TEMPO_ATUALIZADO',
            timestamp: now,
            data: { segundosRestantes: this.mockSecondsRemaining }
          });
          break;

        case 'DESARMAR':
          // Confirmar desarme
          this.stopMockTimer();
          this.simulateNotification({
            type: 'BOMBA_DESARMADA',
            timestamp: now,
            data: { tempoFinal: this.mockSecondsRemaining }
          });
          break;

        case 'EXPLODIR':
          // Confirmar explosão
          this.stopMockTimer();
          this.simulateNotification({
            type: 'BOMBA_EXPLODIDA',
            timestamp: now,
            data: { motivo: 'manual' }
          });
          break;

        case 'REINICIAR':
          // Resetar timer
          this.stopMockTimer();
          this.mockSecondsRemaining = 600;
          break;
      }
    }, 300); // Simula latência de 300ms
  }

  /**
   * MODO MOCK: Iniciar timer automático que envia TEMPO_ATUALIZADO a cada 5 segundos
   */
  private startMockTimer(): void {
    this.stopMockTimer();
    
    this.mockTimerInterval = setInterval(() => {
      if (this.mockSecondsRemaining > 0) {
        this.mockSecondsRemaining -= 5;
        
        // Enviar atualização
        this.simulateNotification({
          type: 'TEMPO_ATUALIZADO',
          timestamp: Date.now(),
          data: { segundosRestantes: Math.max(0, this.mockSecondsRemaining) }
        });

        // Se chegou a 0, explodir automaticamente
        if (this.mockSecondsRemaining <= 0) {
          this.stopMockTimer();
          setTimeout(() => {
            this.simulateNotification({
              type: 'BOMBA_EXPLODIDA',
              timestamp: Date.now(),
              data: { motivo: 'timeout' }
            });
          }, 500);
        }
      }
    }, 5000); // A cada 5 segundos
    
    console.log('[BluetoothService Mock] Timer automático iniciado');
  }

  /**
   * MODO MOCK: Parar timer automático
   */
  private stopMockTimer(): void {
    if (this.mockTimerInterval) {
      clearInterval(this.mockTimerInterval);
      this.mockTimerInterval = null;
      console.log('[BluetoothService Mock] Timer automático parado');
    }
  }

  /**
   * Configurar monitoramento de notificações BLE (modo real)
   */
  private async setupNotifications(): Promise<void> {
    if (!this.connectedDevice || !this.manager) {
      console.warn('[BluetoothService] Não é possível configurar notificações: device/manager não disponível');
      return;
    }

    try {
      console.log('[BluetoothService] Configurando notificações BLE...');
      
      // Descobrir serviços e características
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Encontrar característica de notificação
      const services = await this.connectedDevice.services();
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        
        for (const char of characteristics) {
          // Procurar característica com propriedade "notify"
          if (char.isNotifiable) {
            this.notifyCharacteristic = char;
            console.log('[BluetoothService] Característica de notificação encontrada:', char.uuid);
            break;
          }
        }
        
        if (this.notifyCharacteristic) break;
      }

      if (!this.notifyCharacteristic) {
        console.warn('[BluetoothService] Nenhuma característica de notificação encontrada');
        return;
      }

      // Monitorar notificações
      this.notifySubscription = this.notifyCharacteristic.monitor((error, characteristic) => {
        if (error) {
          console.error('[BluetoothService] Erro ao monitorar notificações:', error);
          return;
        }

        if (characteristic?.value) {
          try {
            // Decodificar base64
            const decoded = base64Decode(characteristic.value);
            
            // Parse JSON
            const notification: BluetoothNotification = JSON.parse(decoded);
            
            // Processar notificação
            this.handleNotification(notification);
          } catch (parseError) {
            console.error('[BluetoothService] Erro ao processar notificação:', parseError);
          }
        }
      });

      console.log('[BluetoothService] Notificações BLE ativadas com sucesso');
    } catch (error) {
      console.error('[BluetoothService] Erro ao configurar notificações:', error);
    }
  }

  async scanForDevices(
    onDeviceFound: (device: BluetoothDevice) => void
  ): Promise<() => void> {
    if (!this.manager) {
      throw new Error('Bluetooth manager not initialized');
    }

    const devicesMap = new Map<string, BluetoothDevice>();

    const subscription = this.manager.startDeviceScan(
      this.TARGET_SERVICE_UUID ? [this.TARGET_SERVICE_UUID] : null,
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          return;
        }
        if (!device) return;

        const name = device.name || device.localName || 'Sem nome';
        if (!devicesMap.has(device.id)) {
          const bluetoothDevice: BluetoothDevice = {
            id: device.id,
            name,
            rssi: device.rssi ?? null,
            device,
          };
          devicesMap.set(device.id, bluetoothDevice);
          onDeviceFound(bluetoothDevice);
        }
      }
    );

    return () => {
      this.manager?.stopDeviceScan();
    };
  }

  /**
   * Procura por um dispositivo Bluetooth específico pelo nome
   * @param deviceName - Nome do dispositivo (ex: "ESP32_BOMB_05")
   * @param timeoutMs - Timeout em milissegundos (padrão: 10000)
   * @returns Device encontrado ou erro
   */
  async findDeviceByName(deviceName: string, timeoutMs: number = 10000): Promise<Device> {
    console.log(`[BluetoothService] Procurando dispositivo: ${deviceName}`);
    
    // Mock mode
    if (this.isMockMode) {
      return this.mockFindDevice(deviceName, timeoutMs);
    }

    if (!this.manager) {
      throw new Error('Bluetooth manager not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager?.stopDeviceScan();
        reject(new Error(`Dispositivo "${deviceName}" não encontrado após ${timeoutMs}ms`));
      }, timeoutMs);

      let found = false;

      this.manager!.startDeviceScan(
        this.TARGET_SERVICE_UUID ? [this.TARGET_SERVICE_UUID] : null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            clearTimeout(timeout);
            this.manager?.stopDeviceScan();
            reject(error);
            return;
          }

          if (!device || found) return;

          const name = device.name || device.localName;
          console.log(`[BluetoothService] Dispositivo encontrado: ${name}`);

          // Comparação case-insensitive
          if (name && name.toLowerCase() === deviceName.toLowerCase() && device) {
            found = true;
            clearTimeout(timeout);
            this.manager?.stopDeviceScan();
            console.log(`[BluetoothService] ✅ Dispositivo "${deviceName}" encontrado!`);
            resolve(device);
          }
        }
      );
    });
  }

  /**
   * Mock: Simula busca de dispositivo
   */
  private async mockFindDevice(deviceName: string, timeoutMs: number): Promise<Device> {
    console.log(`[BluetoothService MOCK] Procurando ${deviceName}...`);
    
    // Simular delay de busca
    await this.sleep(Math.min(timeoutMs / 2, 2000));

    // Simular cenários
    if (this.mockScenario === 'device_not_found') {
      throw new Error(`[MOCK] Dispositivo "${deviceName}" não encontrado`);
    }

    if (this.mockScenario === 'timeout') {
      await this.sleep(timeoutMs + 1000);
      throw new Error(`[MOCK] Timeout ao procurar dispositivo`);
    }

    // Sucesso: retornar mock device
    console.log(`[BluetoothService MOCK] ✅ Dispositivo encontrado`);
    return {
      id: 'mock-device-id',
      name: deviceName,
      localName: deviceName,
    } as Device;
  }

  async connectToDevice(device: Device): Promise<void> {
    console.log('BluetoothService.connectToDevice chamado');
    console.log('Device ID:', device.id);
    console.log('Device Name:', device.name);
    
    // Mock mode
    if (this.isMockMode) {
      return this.mockConnect(device);
    }
    
    if (!this.manager) {
      console.error('Bluetooth manager not initialized');
      throw new Error('Bluetooth manager not initialized');
    }

    if (!device || !device.id) {
      console.error('Invalid device object:', device);
      throw new Error('Dispositivo inválido');
    }

    try {
      console.log('Parando scan...');
      this.manager.stopDeviceScan();
      
      console.log('Conectando ao dispositivo:', device.id);
      const connected = await this.manager.connectToDevice(device.id, {
        autoConnect: false,
      });
      console.log('Dispositivo conectado, descobrindo serviços...');

      const discovered = await connected.discoverAllServicesAndCharacteristics();
      console.log('Serviços descobertos');
      await this.sleep(200);

      if (Platform.OS === 'android') {
        try {
          console.log('Negociando MTU...');
          const afterMtu = await discovered.requestMTU(this.PREFERRED_MTU);
          this.negotiatedMtu = afterMtu.mtu ?? null;
          console.log('MTU negociado:', this.negotiatedMtu);
        } catch (e) {
          console.warn('MTU negotiation failed', e);
        }
      }

      console.log('Procurando característica gravável...');
      const writable = await this.pickWritableCharacteristic(discovered.id);

      if (!writable) {
        console.error('No writable characteristic found');
        throw new Error('Nenhuma característica gravável encontrada');
      }

      console.log('Característica gravável encontrada:', writable.uuid);
      this.connectedDevice = discovered;
      this.writableCharacteristic = writable;
      console.log('Conexão estabelecida com sucesso!');
      
      // Configurar notificações BLE
      await this.setupNotifications();
      
      this.notifyConnectionListeners(true);
    } catch (error) {
      console.error('Erro durante conexão:', error);
      this.connectedDevice = null;
      this.writableCharacteristic = undefined;
      this.notifyConnectionListeners(false);
      throw error;
    }
  }

  /**
   * Mock: Simula conexão com dispositivo
   */
  private async mockConnect(device: Device): Promise<void> {
    console.log(`[BluetoothService MOCK] Conectando a ${device.name}...`);
    
    // Simular delay de conexão
    await this.sleep(1500);

    // Simular cenários de erro
    if (this.mockScenario === 'connection_fail') {
      throw new Error('[MOCK] Falha ao conectar ao dispositivo');
    }

    if (this.mockScenario === 'timeout') {
      await this.sleep(15000);
      throw new Error('[MOCK] Timeout ao conectar');
    }

    // Sucesso
    console.log('[BluetoothService MOCK] ✅ Conectado com sucesso');
    this.connectedDevice = device;
    this.writableCharacteristic = { uuid: 'mock-char' } as Characteristic;
    this.notifyConnectionListeners(true);
  }

  async disconnect(): Promise<void> {
    // Parar timer mock se estiver rodando
    this.stopMockTimer();
    
    // Limpar subscription de notificações
    if (this.notifySubscription) {
      this.notifySubscription.remove();
      this.notifySubscription = null;
    }
    
    if (this.isMockMode) {
      console.log('[BluetoothService MOCK] Desconectando...');
      this.connectedDevice = null;
      this.writableCharacteristic = undefined;
      this.notifyCharacteristic = undefined;
      this.commandQueue = [];
      this.notifyConnectionListeners(false);
      return;
    }

    if (this.connectedDevice && this.manager) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      } catch (e) {
        console.error('Disconnect error:', e);
      }
    }
    this.connectedDevice = null;
    this.writableCharacteristic = undefined;
    this.notifyCharacteristic = undefined;
    this.commandQueue = [];
    this.notifyConnectionListeners(false);
  }

  async sendCommand(command: BluetoothCommand): Promise<void> {
    if (this.isMockMode) {
      console.log(`[MOCK] Bluetooth command: ${command}`);
      
      // Auto-notificações em modo mock
      this.mockAutoNotify(command);
      
      return Promise.resolve();
    }

    if (!this.isConnected()) {
      throw new Error('Not connected to Bluetooth device');
    }

    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        command,
        resolve,
        reject,
        retries: 0,
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const queued = this.commandQueue.shift();
      if (!queued) break;

      try {
        await this.executeCommand(queued.command);
        queued.resolve();
      } catch (error) {
        if (queued.retries < this.MAX_RETRIES) {
          queued.retries++;
          this.commandQueue.unshift(queued);
          await this.sleep(1000 * queued.retries);
        } else {
          queued.reject(error as Error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeCommand(command: BluetoothCommand): Promise<void> {
    if (!this.connectedDevice || !this.writableCharacteristic || !this.manager) {
      throw new Error('Not connected');
    }

    const payload = command;
    const chunkSize = 20;
    const chunks: string[] = [];

    for (let i = 0; i < payload.length; i += chunkSize) {
      chunks.push(payload.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      try {
        const b64 = base64Encode(chunk);
        if (this.writableCharacteristic.isWritableWithoutResponse) {
          await this.manager.writeCharacteristicWithoutResponseForDevice(
            this.connectedDevice.id,
            this.writableCharacteristic.serviceUUID!,
            this.writableCharacteristic.uuid,
            b64
          );
        } else {
          await this.manager.writeCharacteristicWithResponseForDevice(
            this.connectedDevice.id,
            this.writableCharacteristic.serviceUUID!,
            this.writableCharacteristic.uuid,
            b64
          );
        }
        await this.sleep(20);
      } catch (err) {
        console.warn('Write failed, retrying with response', err);
        await this.sleep(50);
        const b64 = base64Encode(chunk);
        await this.manager.writeCharacteristicWithResponseForDevice(
          this.connectedDevice.id,
          this.writableCharacteristic.serviceUUID!,
          this.writableCharacteristic.uuid,
          b64
        );
      }
    }

    console.log(`Command sent: ${command}`);
  }

  private async pickWritableCharacteristic(
    deviceId: string
  ): Promise<Characteristic | undefined> {
    if (!this.manager) return undefined;

    try {
      if (this.TARGET_SERVICE_UUID) {
        const chars = await this.manager.characteristicsForDevice(
          deviceId,
          this.TARGET_SERVICE_UUID
        );
        let candidate = chars.find(
          (ch) =>
            this.equalsUuid(ch.uuid, this.TARGET_WRITE_CHAR_UUID) &&
            (ch.isWritableWithoutResponse || ch.isWritableWithResponse)
        );
        if (candidate) return candidate;
        candidate = chars.find(
          (ch) => ch.isWritableWithoutResponse || ch.isWritableWithResponse
        );
        if (candidate) return candidate;
      }

      const services = await this.manager.servicesForDevice(deviceId);
      let best: Characteristic | undefined = undefined;
      for (const svc of services) {
        if (
          this.TARGET_SERVICE_UUID &&
          !this.equalsUuid(svc.uuid, this.TARGET_SERVICE_UUID)
        ) {
          continue;
        }
        const chars = await this.manager.characteristicsForDevice(
          deviceId,
          svc.uuid
        );
        const noResp = chars.find((ch) => ch.isWritableWithoutResponse);
        if (noResp) return noResp;
        const withResp = chars.find((ch) => ch.isWritableWithResponse);
        if (withResp && !best) best = withResp;
      }
      return best;
    } catch (err) {
      console.error('Failed to pick writable characteristic', err);
      return undefined;
    }
  }

  private equalsUuid(a?: string | null, b?: string | null): boolean {
    return !!a && !!b && a.toLowerCase() === b.toLowerCase();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  destroy(): void {
    this.disconnect();
    this.manager?.destroy();
    this.manager = null;
  }

  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }
}

export const bluetoothService = new BluetoothService();

