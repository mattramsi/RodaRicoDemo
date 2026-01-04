import { BleManager, Characteristic, Device } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { encode as base64Encode } from 'base-64';

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
  private commandQueue: QueuedCommand[] = [];
  private isProcessingQueue = false;
  private isMockMode = false;
  private mockScenario: MockScenario = 'success';
  private negotiatedMtu: number | null = null;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  private readonly MAX_RETRIES = 3;
  private readonly COMMAND_TIMEOUT = 5000;
  private readonly TARGET_SERVICE_UUID: string | undefined = undefined;
  private readonly TARGET_WRITE_CHAR_UUID: string | undefined = undefined;
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
    if (this.isMockMode) {
      console.log('[BluetoothService MOCK] Desconectando...');
      this.connectedDevice = null;
      this.writableCharacteristic = undefined;
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
    this.commandQueue = [];
    this.notifyConnectionListeners(false);
  }

  async sendCommand(command: BluetoothCommand): Promise<void> {
    if (this.isMockMode) {
      console.log(`[MOCK] Bluetooth command: ${command}`);
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

