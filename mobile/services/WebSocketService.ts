import { AuthService } from './AuthService';

export type WSMessage =
  | { action: 'createTime'; data: { nome: string } }
  | { action: 'getTime'; data: { id: number } }
  | { action: 'joinTeam'; data: { id?: number; nome?: string } }
  | { action: 'iniciarPartida'; data: { timeId: number; cabineId: number } }
  | { action: 'answerPerguntas'; data: { perguntaId: number; answer: string; partidaId: number } }
  | { action: 'finalizarPartida'; data: { id: number; result: boolean } };

export interface WSResponse {
  success?: boolean;
  action?: string;
  type?: string; // Fallback para compatibilidade
  data?: any;
  error?: string;
  message?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isIntentionallyClosed = false;

  private getBackoffDelay(attempt: number): number {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    return delay;
  }

  async connect(endpoint: 'time' | 'partida'): Promise<void> {
    // Reset completo antes de conectar (limpa estado anterior)
    if (this.ws || this.reconnectTimeout) {
      console.log('[WebSocket] Resetando conexão anterior');
      this.reset();
    }
    
    const token = await AuthService.getAccessToken();
    if (!token) {
      console.error('[WebSocket] Token não disponível');
      throw new Error('No access token available');
    }

    // Remover "Bearer " se presente
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    this.url = `wss://rodarico.app.br/ws/${endpoint}?token=${cleanToken}`;
    
    console.log('[WebSocket] Conectando ao:', endpoint);
    console.log('[WebSocket] URL:', this.url.replace(cleanToken, 'TOKEN_HIDDEN'));
    console.log('[WebSocket] Token length:', cleanToken.length);
    
    // Garantir que está pronto para conectar
    this.reconnectAttempts = 0;
    this.isIntentionallyClosed = false;
    
    return this.connectInternal();
  }

  private async connectInternal(): Promise<void> {
    this.isIntentionallyClosed = false;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.url);

        ws.onopen = () => {
          console.log('[WebSocket] Conectado com sucesso');
          console.log('[WebSocket] URL final:', this.url.replace(/token=[^&]+/, 'token=HIDDEN'));
          this.ws = ws;
          this.reconnectAttempts = 0;
          this.notifyConnectionListeners(true);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            console.log('[WebSocket] Mensagem recebida (raw):', event.data);
            const response: WSResponse = JSON.parse(event.data);
            console.log('[WebSocket] Mensagem parseada:', JSON.stringify(response, null, 2));
            this.handleMessage(response);
          } catch (error) {
            console.error('[WebSocket] Erro ao fazer parse da mensagem:', error);
            console.error('[WebSocket] Dados recebidos:', event.data);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          this.ws = null;
          this.notifyConnectionListeners(false);

          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async attemptReconnect(): Promise<void> {
    // Limpar timeout anterior se existir
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Incrementar tentativas ANTES de verificar o máximo
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error(`[WebSocket] Máximo de ${this.maxReconnectAttempts} tentativas de reconexão atingido`);
      return;
    }

    const delay = this.getBackoffDelay(this.reconnectAttempts - 1);
    console.log(`[WebSocket] Reconectando em ${delay}ms (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await this.connectInternal();
        console.log('[WebSocket] Reconexão bem-sucedida!');
      } catch (error) {
        console.error(`[WebSocket] Falha na tentativa ${this.reconnectAttempts}:`, error);
        // Não chamar attemptReconnect aqui - o onclose vai fazer isso
      }
    }, delay);
  }

  private handleMessage(response: WSResponse): void {
    // Usar 'action' como preferência, fallback para 'type'
    const messageType = response.action || response.type || '';
    console.log('[WebSocket] Processando mensagem tipo:', messageType);
    console.log('[WebSocket] Success:', response.success);
    console.log('[WebSocket] Error:', response.error);
    
    // Notificar listeners específicos pelo action/type
    if (messageType) {
      const listeners = this.listeners.get(messageType);
      if (listeners) {
        console.log(`[WebSocket] Encontrados ${listeners.size} listeners para tipo "${messageType}"`);
        listeners.forEach((callback) => callback(response.data));
      } else {
        console.log(`[WebSocket] Nenhum listener encontrado para tipo "${messageType}"`);
      }
    }

    // Also notify generic listeners
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      console.log(`[WebSocket] Notificando ${allListeners.size} listeners genéricos`);
      allListeners.forEach((callback) => callback(response));
    }
    
    // Log de erros
    if (response.error || (response.success === false)) {
      console.error('[WebSocket] Erro na mensagem:', response.error || response.message);
    }
  }

  send(message: WSMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Tentativa de envio sem conexão');
      throw new Error('WebSocket is not connected');
    }

    const messageString = JSON.stringify(message);
    console.log('[WebSocket] Enviando mensagem:', messageString);
    console.log('[WebSocket] Action da mensagem:', message.action || (message as any).type);
    console.log('[WebSocket] Dados:', JSON.stringify(message.data, null, 2));
    
    this.ws.send(messageString);
  }

  onMessage(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(callback);
      }
    };
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

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyConnectionListeners(false);
  }

  /**
   * Reset completo do WebSocket - limpa todo o estado e para reconexões
   * Use quando voltar ao lobby ou resetar o jogo
   */
  reset(): void {
    console.log('[WebSocket] Reset completo do serviço');
    this.isIntentionallyClosed = true;
    
    // Limpar timeout de reconexão
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Desconectar WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Resetar contador de tentativas
    this.reconnectAttempts = 0;
    
    // Notificar listeners
    this.notifyConnectionListeners(false);
  }
}

export const wsService = new WebSocketService();

