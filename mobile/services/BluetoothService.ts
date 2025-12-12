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

export class BluetoothService {
  private manager: BleManager | null = null;
  private connectedDevice: Device | null = null;
  private writableCharacteristic: Characteristic | undefined = undefined;
  private commandQueue: QueuedCommand[] = [];
  private isProcessingQueue = false;
  private isMockMode = false;
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

  enableMockMode(): void {
    this.isMockMode = true;
    this.notifyConnectionListeners(true);
  }

  disableMockMode(): void {
    this.isMockMode = false;
    this.notifyConnectionListeners(false);
  }

  isMockModeEnabled(): boolean {
    return this.isMockMode;
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
      // Verificar se subscription existe e tem método remove antes de chamar
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }

  async connectToDevice(device: Device): Promise<void> {
    if (!this.manager) {
      throw new Error('Bluetooth manager not initialized');
    }

    try {
      this.manager.stopDeviceScan();
      const connected = await this.manager.connectToDevice(device.id, {
        autoConnect: false,
      });

      const discovered = await connected.discoverAllServicesAndCharacteristics();
      await this.sleep(200);

      if (Platform.OS === 'android') {
        try {
          const afterMtu = await discovered.requestMTU(this.PREFERRED_MTU);
          this.negotiatedMtu = afterMtu.mtu ?? null;
        } catch (e) {
          console.warn('MTU negotiation failed', e);
        }
      }

      const writable = await this.pickWritableCharacteristic(discovered.id);

      if (!writable) {
        throw new Error('No writable characteristic found');
      }

      this.connectedDevice = discovered;
      this.writableCharacteristic = writable;
      this.notifyConnectionListeners(true);
    } catch (error) {
      this.connectedDevice = null;
      this.writableCharacteristic = undefined;
      this.notifyConnectionListeners(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
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

