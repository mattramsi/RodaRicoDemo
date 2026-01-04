/**
 * Configuração do modo do aplicativo
 * 
 * Use este arquivo para alternar entre a versão básica e completa do app
 */

export type AppMode = 'basic' | 'full';

/**
 * Modo atual do aplicativo
 * - 'basic': Versão simplificada apenas com Bluetooth e controle
 * - 'full': Versão completa com todas as funcionalidades de jogo
 */
export const APP_MODE: AppMode = 'basic'; // Configurado para versão básica

/**
 * Informações sobre os modos disponíveis
 */
export const APP_MODES = {
  basic: {
    name: 'Versão Básica',
    description: 'Apenas conexão Bluetooth e controle de estímulos',
    bundleId: 'br.com.rn360.rodaricoteste',
  },
  full: {
    name: 'Versão Completa',
    description: 'App completo com todas as funcionalidades de jogo',
    bundleId: 'br.com.rn360.rodarico',
  },
} as const;




