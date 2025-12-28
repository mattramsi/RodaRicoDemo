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

export class BluetoothService {
  private manager: BleManager | null = null;
  private connectedDevice: Device | null = null;
  private writableCharacteristic: Characteristic | undefined = undefined;
  private isMockMode = false;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  constructor() {
    this.manager = new BleManager();
  }

  enableMockMode(): void {
    this.isMockMode = true;
    this.notifyConnectionListeners(true);
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
      null,
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
          await discovered.requestMTU(185);
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

    await this.executeCommand(command);
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
    }

    console.log(`Command sent: ${command}`);
  }

  private async pickWritableCharacteristic(
    deviceId: string
  ): Promise<Characteristic | undefined> {
    if (!this.manager) return undefined;

    try {
      const services = await this.manager.servicesForDevice(deviceId);
      for (const svc of services) {
        const chars = await this.manager.characteristicsForDevice(deviceId, svc.uuid);
        const noResp = chars.find((ch) => ch.isWritableWithoutResponse);
        if (noResp) return noResp;
        const withResp = chars.find((ch) => ch.isWritableWithResponse);
        if (withResp) return withResp;
      }
      return undefined;
    } catch (err) {
      console.error('Failed to pick writable characteristic', err);
      return undefined;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }
}

export const bluetoothService = new BluetoothService();

