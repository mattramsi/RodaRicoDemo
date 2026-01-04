// Tipos relacionados ao sistema de Sala por Cabine

export interface QRCodeData {
  v: string; // Versão do formato
  type: string; // Deve ser "rodarico_cabin"
  cabinId: number;
  bluetoothName: string;
  hardware?: {
    version?: string;
    firmware?: string;
  };
  timestamp?: string;
}

export interface CabinParticipant {
  id: number;
  nickname: string;
  isLeader: boolean;
  joinedAt?: string;
}

export type CabinRole = 'leader' | 'participant' | null;

export type CabinStatus = 'empty' | 'waiting' | 'active' | 'playing' | 'finished';

export interface CabinRoomData {
  cabinId: number;
  role: CabinRole;
  cabinStatus: CabinStatus;
  teamId?: number;
  teamName?: string;
  leaderId?: number;
  leaderNickname?: string;
  playersInRoom: CabinParticipant[];
  bluetoothDeviceName?: string;
}

// Erros possíveis do sistema de cabine
export type CabinErrorCode =
  | 'CABIN_NOT_FOUND'
  | 'CABIN_IN_GAME'
  | 'CABIN_FINISHED'
  | 'PERMISSION_DENIED'
  | 'TEAM_ALREADY_EXISTS'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_TEAM_NAME'
  | 'PLAYER_ALREADY_IN_CABIN'
  | 'WEBSOCKET_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTHENTICATION_FAILED'
  | 'SERVER_ERROR'
  | 'INVALID_QR_CODE'
  | 'INVALID_CABIN_ID'
  | 'INVALID_BLUETOOTH_NAME';

export interface CabinError {
  code: CabinErrorCode;
  message: string;
  details?: any;
}

