/**
 * Tipos relacionados ao Bluetooth
 */

export type BluetoothCommand = 'INICIAR' | 'DESARMAR' | 'ACELERAR' | 'EXPLODIR' | 'REINICIAR';

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number | null;
  device: any; // Device from react-native-ble-plx
}




