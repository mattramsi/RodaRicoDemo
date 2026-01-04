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

/**
 * Tipos de notificações Bluetooth recebidas do ESP32
 */
export type BluetoothNotificationType = 
  | 'BOMBA_RESFRIADA'
  | 'BOMBA_DESARMADA'
  | 'BOMBA_EXPLODIDA'
  | 'TEMPO_ATUALIZADO'
  | 'STATUS_CONEXAO';

/**
 * Base para todas as notificações Bluetooth
 */
export interface BluetoothNotificationBase {
  type: BluetoothNotificationType;
  timestamp: number;
}

/**
 * Notificação: Bomba foi resfriada (item especial usado)
 */
export interface BombaResfriadaNotification extends BluetoothNotificationBase {
  type: 'BOMBA_RESFRIADA';
  data: {
    segundosAdicionados: number;
  };
}

/**
 * Notificação: Bomba foi desarmada com sucesso
 */
export interface BombaDesarmadaNotification extends BluetoothNotificationBase {
  type: 'BOMBA_DESARMADA';
  data: {
    tempoFinal: number; // segundos restantes quando desarmada
  };
}

/**
 * Notificação: Bomba explodiu
 */
export interface BombaExplodidaNotification extends BluetoothNotificationBase {
  type: 'BOMBA_EXPLODIDA';
  data: {
    motivo: 'timeout' | 'todas_erradas' | 'manual';
  };
}

/**
 * Notificação: Atualização do timer (sincronização)
 */
export interface TempoAtualizadoNotification extends BluetoothNotificationBase {
  type: 'TEMPO_ATUALIZADO';
  data: {
    segundosRestantes: number;
  };
}

/**
 * Notificação: Status de conexão
 */
export interface StatusConexaoNotification extends BluetoothNotificationBase {
  type: 'STATUS_CONEXAO';
  data: {
    conectado: boolean;
  };
}

/**
 * União de todos os tipos de notificações
 */
export type BluetoothNotification =
  | BombaResfriadaNotification
  | BombaDesarmadaNotification
  | BombaExplodidaNotification
  | TempoAtualizadoNotification
  | StatusConexaoNotification;
