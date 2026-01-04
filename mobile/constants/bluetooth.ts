/**
 * Constantes relacionadas ao Bluetooth
 */

// Nome do dispositivo alvo para conexão automática
export const TARGET_DEVICE_NAME = 'Bomba';

// Comandos disponíveis para o dispositivo
export const BLUETOOTH_COMMANDS = {
  INICIAR: 'INICIAR' as const,
  DESARMAR: 'DESARMAR' as const,
  ACELERAR: 'ACELERAR' as const,
  EXPLODIR: 'EXPLODIR' as const,
  REINICIAR: 'REINICIAR' as const,
} as const;

// Labels dos comandos para exibição
export const COMMAND_LABELS: Record<string, string> = {
  INICIAR: 'Iniciar',
  DESARMAR: 'Desarmar',
  ACELERAR: 'Acelerar',
  EXPLODIR: 'Explodir',
  REINICIAR: 'Reiniciar',
};

// Cores dos botões por comando
export const COMMAND_COLORS: Record<string, string> = {
  INICIAR: '#10b981', // Verde
  DESARMAR: '#6b7280', // Cinza
  ACELERAR: '#f59e0b', // Amarelo/Laranja
  EXPLODIR: '#ef4444', // Vermelho
  REINICIAR: '#3b82f6', // Azul
};




