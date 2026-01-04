# 📡 Plano: Sistema de Notificações Bluetooth Bidirecionais

## 🎯 Objetivo

Implementar um sistema onde o **ESP32 (bomba)** envia notificações para o **App** sobre eventos importantes, permitindo sincronização em tempo real.

---

## 📊 Status Atual vs Desejado

### ❌ Atual (Unidirecional)

```
┌─────────┐                    ┌─────────┐
│   APP   │ ───── comandos ──→ │  ESP32  │
│         │                    │ (Bomba) │
└─────────┘                    └─────────┘

Comandos enviados:
• INICIAR
• ACELERAR  
• EXPLODIR
• DESARMAR
• REINICIAR
```

### ✅ Desejado (Bidirecionais)

```
┌─────────┐                    ┌─────────┐
│   APP   │ ───── comandos ──→ │  ESP32  │
│         │ ←── notificações ─ │ (Bomba) │
└─────────┘                    └─────────┘

Comandos enviados (App → ESP32):
• INICIAR, ACELERAR, EXPLODIR, DESARMAR, REINICIAR

Notificações recebidas (ESP32 → App):
• BOMBA_RESFRIADA    (Bomba resfriada)
• BOMBA_DESARMADA    (Bomba desarmada)
• BOMBA_EXPLODIDA    (Bomba explodiu)
• TEMPO_ATUALIZADO   (Tempo atual: XX:XX)
```

---

## 🔔 Notificações a Implementar

### 1. **BOMBA_RESFRIADA** ❄️
**Quando:** ESP32 detecta que bomba foi resfriada (item especial usado)

```json
{
  "type": "BOMBA_RESFRIADA",
  "timestamp": 1640000000,
  "data": {
    "segundosAdicionados": 30
  }
}
```

**O que o App faz:**
- ✅ Atualiza `timeRemaining` no `GameContext`
- ✅ Mostra toast/notificação: "❄️ +30 segundos!"
- ✅ Anima o timer (feedback visual)

---

### 2. **BOMBA_DESARMADA** ✅
**Quando:** ESP32 confirma que bomba foi desarmada com sucesso

```json
{
  "type": "BOMBA_DESARMADA",
  "timestamp": 1640000000,
  "data": {
    "tempoFinal": 123
  }
}
```

**O que o App faz:**
- ✅ Confirma que desarme funcionou
- ✅ Mostra tela de sucesso
- ✅ Registra tempo final

---

### 3. **BOMBA_EXPLODIDA** 💥
**Quando:** ESP32 confirma que bomba explodiu

```json
{
  "type": "BOMBA_EXPLODIDA",
  "timestamp": 1640000000,
  "data": {
    "motivo": "timeout" | "todas_erradas"
  }
}
```

**O que o App faz:**
- ✅ Confirma explosão
- ✅ Mostra tela de falha
- ✅ Sincroniza estado

---

### 4. **TEMPO_ATUALIZADO** ⏱️
**Quando:** ESP32 envia tempo atual (a cada 1 segundo, ou a cada 5 segundos)

```json
{
  "type": "TEMPO_ATUALIZADO",
  "timestamp": 1640000000,
  "data": {
    "segundosRestantes": 347
  }
}
```

**O que o App faz:**
- ✅ Sincroniza timer local com ESP32
- ✅ Evita divergências (se app pausar, timer continua)
- ✅ Atualiza UI em tempo real

---

## 🏗️ Arquitetura Proposta

### 1. Novos Tipos TypeScript

```typescript
// mobile/types/bluetooth.ts

export type BluetoothNotificationType = 
  | 'BOMBA_RESFRIADA'
  | 'BOMBA_DESARMADA'
  | 'BOMBA_EXPLODIDA'
  | 'TEMPO_ATUALIZADO'
  | 'STATUS_CONEXAO';

export interface BluetoothNotificationBase {
  type: BluetoothNotificationType;
  timestamp: number;
}

export interface BombaResfriadaNotification extends BluetoothNotificationBase {
  type: 'BOMBA_RESFRIADA';
  data: {
    segundosAdicionados: number;
  };
}

export interface BombaDesarmadaNotification extends BluetoothNotificationBase {
  type: 'BOMBA_DESARMADA';
  data: {
    tempoFinal: number; // segundos restantes
  };
}

export interface BombaExplodidaNotification extends BluetoothNotificationBase {
  type: 'BOMBA_EXPLODIDA';
  data: {
    motivo: 'timeout' | 'todas_erradas' | 'manual';
  };
}

export interface TempoAtualizadoNotification extends BluetoothNotificationBase {
  type: 'TEMPO_ATUALIZADO';
  data: {
    segundosRestantes: number;
  };
}

export type BluetoothNotification =
  | BombaResfriadaNotification
  | BombaDesarmadaNotification
  | BombaExplodidaNotification
  | TempoAtualizadoNotification;
```

---

### 2. Atualizar BluetoothService

```typescript
// mobile/services/BluetoothService.ts

export class BluetoothService {
  // ... código existente ...
  
  // NOVO: Sistema de listeners para notificações
  private notificationListeners: Map<
    BluetoothNotificationType | '*',
    Set<(notification: BluetoothNotification) => void>
  > = new Map();
  
  // NOVO: Característica de notificação (leitura)
  private notifyCharacteristic: Characteristic | undefined = undefined;
  private readonly TARGET_NOTIFY_CHAR_UUID: string = 'UUID_AQUI'; // Definir com firmware

  /**
   * Subscrever para notificações de um tipo específico
   */
  onNotification(
    type: BluetoothNotificationType | '*',
    callback: (notification: BluetoothNotification) => void
  ): () => void {
    if (!this.notificationListeners.has(type)) {
      this.notificationListeners.set(type, new Set());
    }
    
    this.notificationListeners.get(type)!.add(callback);
    
    // Retorna função de cleanup
    return () => {
      this.notificationListeners.get(type)?.delete(callback);
    };
  }

  /**
   * Setup de notificações BLE (chamado após conexão)
   */
  private async setupNotifications(): Promise<void> {
    if (!this.connectedDevice || !this.manager) {
      return;
    }

    try {
      // Descobrir serviços e características
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Encontrar característica de notificação
      const services = await this.connectedDevice.services();
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        
        for (const char of characteristics) {
          // Procurar característica com propriedade "notify"
          if (char.isNotifying || char.properties.notify) {
            this.notifyCharacteristic = char;
            console.log('[BLE] Característica de notificação encontrada:', char.uuid);
            break;
          }
        }
        
        if (this.notifyCharacteristic) break;
      }

      if (!this.notifyCharacteristic) {
        console.warn('[BLE] Nenhuma característica de notificação encontrada');
        return;
      }

      // Monitorar notificações
      this.notifyCharacteristic.monitor((error, characteristic) => {
        if (error) {
          console.error('[BLE] Erro ao monitorar notificações:', error);
          return;
        }

        if (characteristic?.value) {
          this.handleNotification(characteristic.value);
        }
      });

      console.log('[BLE] Notificações ativadas com sucesso');
    } catch (error) {
      console.error('[BLE] Erro ao configurar notificações:', error);
    }
  }

  /**
   * Processar notificação recebida do ESP32
   */
  private handleNotification(base64Value: string): void {
    try {
      // Decodificar base64
      const decoded = atob(base64Value);
      
      // Parse JSON
      const notification: BluetoothNotification = JSON.parse(decoded);
      
      console.log('[BLE] Notificação recebida:', notification);

      // Notificar listeners específicos do tipo
      const typeListeners = this.notificationListeners.get(notification.type);
      if (typeListeners) {
        typeListeners.forEach(callback => callback(notification));
      }

      // Notificar listeners genéricos (*)
      const allListeners = this.notificationListeners.get('*');
      if (allListeners) {
        allListeners.forEach(callback => callback(notification));
      }
    } catch (error) {
      console.error('[BLE] Erro ao processar notificação:', error);
    }
  }

  /**
   * MODO MOCK: Simular notificação
   */
  simulateNotification(notification: BluetoothNotification): void {
    if (!this.isMockMode) {
      console.warn('[BLE] simulateNotification só funciona em modo mock');
      return;
    }

    console.log('[BLE Mock] Simulando notificação:', notification);
    
    // Processar como se fosse real
    const typeListeners = this.notificationListeners.get(notification.type);
    if (typeListeners) {
      typeListeners.forEach(callback => callback(notification));
    }

    const allListeners = this.notificationListeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => callback(notification));
    }
  }

  /**
   * MODO MOCK: Auto-simular notificações baseadas em comandos
   */
  private mockAutoNotify(command: BluetoothCommand): void {
    if (!this.isMockMode) return;

    setTimeout(() => {
      switch (command) {
        case 'INICIAR':
          // Após INICIAR, enviar timer inicial
          this.simulateNotification({
            type: 'TEMPO_ATUALIZADO',
            timestamp: Date.now(),
            data: { segundosRestantes: 600 }
          });
          break;

        case 'DESARMAR':
          // Confirmar desarme
          this.simulateNotification({
            type: 'BOMBA_DESARMADA',
            timestamp: Date.now(),
            data: { tempoFinal: 234 }
          });
          break;

        case 'EXPLODIR':
          // Confirmar explosão
          this.simulateNotification({
            type: 'BOMBA_EXPLODIDA',
            timestamp: Date.now(),
            data: { motivo: 'timeout' }
          });
          break;
      }
    }, 300); // Simula latência
  }

  // Atualizar sendCommand para incluir auto-notificações mock
  async sendCommand(command: BluetoothCommand): Promise<void> {
    // ... código existente ...
    
    // NOVO: Auto-notificações em mock
    this.mockAutoNotify(command);
    
    // ... resto do código ...
  }
}
```

---

### 3. Integração com Telas

#### QuizScreen - Sincronizar Timer

```typescript
// mobile/screens/QuizScreen.tsx

useEffect(() => {
  // Listener para atualizações de timer do ESP32
  const unsubscribe = bluetoothService.onNotification(
    'TEMPO_ATUALIZADO',
    (notification) => {
      if (notification.type === 'TEMPO_ATUALIZADO') {
        console.log('[Quiz] Timer atualizado pelo ESP32:', notification.data.segundosRestantes);
        setTimeRemaining(notification.data.segundosRestantes);
      }
    }
  );

  return unsubscribe;
}, []);

useEffect(() => {
  // Listener para explosão (se ESP32 explodir autonomamente)
  const unsubscribe = bluetoothService.onNotification(
    'BOMBA_EXPLODIDA',
    (notification) => {
      if (notification.type === 'BOMBA_EXPLODIDA') {
        console.log('[Quiz] Bomba explodiu (notificação ESP32)');
        handleTimeOut(); // Força fim do jogo
      }
    }
  );

  return unsubscribe;
}, []);

useEffect(() => {
  // Listener para resfriamento (item especial)
  const unsubscribe = bluetoothService.onNotification(
    'BOMBA_RESFRIADA',
    (notification) => {
      if (notification.type === 'BOMBA_RESFRIADA') {
        const { segundosAdicionados } = notification.data;
        console.log(`[Quiz] Bomba resfriada! +${segundosAdicionados}s`);
        
        // Atualizar timer
        setTimeRemaining(prev => prev + segundosAdicionados);
        
        // Mostrar feedback visual
        Alert.alert('❄️ Bomba Resfriada!', `+${segundosAdicionados} segundos`);
      }
    }
  );

  return unsubscribe;
}, []);
```

#### ResultScreen - Confirmar Desarme

```typescript
// mobile/screens/ResultScreen.tsx

const handleDisarm = async () => {
  setDisarming(true);
  
  // Listener para confirmação de desarme
  const unsubscribe = bluetoothService.onNotification(
    'BOMBA_DESARMADA',
    (notification) => {
      if (notification.type === 'BOMBA_DESARMADA') {
        console.log('[Result] Desarme confirmado pelo ESP32!');
        const { tempoFinal } = notification.data;
        
        setDisarming(false);
        
        // Mostrar tela de sucesso
        Alert.alert(
          '✅ Bomba Desarmada!',
          `Tempo restante: ${Math.floor(tempoFinal / 60)}:${String(tempoFinal % 60).padStart(2, '0')}`
        );
        
        // Cleanup
        unsubscribe();
        
        // Navegar
        onPlayAgain();
      }
    }
  );
  
  // Timeout de segurança
  setTimeout(() => {
    if (disarming) {
      console.warn('[Result] Timeout aguardando confirmação de desarme');
      unsubscribe();
      setDisarming(false);
      // Considerar como sucesso mesmo sem confirmação
      onPlayAgain();
    }
  }, 5000);
  
  // Enviar comando
  await bluetoothService.sendCommand('DESARMAR');
};
```

---

## 📋 Plano de Implementação

### Fase 1: Tipos e Estrutura Base
**Tempo estimado:** 1-2 horas

- [ ] Criar `types/bluetooth.ts` com tipos de notificações
- [ ] Documentar formato JSON de cada notificação
- [ ] Criar interfaces TypeScript

### Fase 2: BluetoothService - Listeners
**Tempo estimado:** 2-3 horas

- [ ] Adicionar `notificationListeners: Map<>`
- [ ] Implementar `onNotification()` method
- [ ] Implementar `handleNotification()` private method
- [ ] Adicionar cleanup em `disconnect()`

### Fase 3: BluetoothService - BLE Notifications
**Tempo estimado:** 3-4 horas

- [ ] Implementar `setupNotifications()` para encontrar característica
- [ ] Configurar `characteristic.monitor()` para receber dados
- [ ] Decodificar base64 e parse JSON
- [ ] Testar com ESP32 real (se disponível)

### Fase 4: Mock Mode para Notificações
**Tempo estimado:** 2 horas

- [ ] Implementar `simulateNotification()`
- [ ] Implementar `mockAutoNotify()` (auto-responder a comandos)
- [ ] Testar notificações mock no app

### Fase 5: Integração com QuizScreen
**Tempo estimado:** 2 horas

- [ ] Listener para `TEMPO_ATUALIZADO` → sincronizar timer
- [ ] Listener para `BOMBA_EXPLODIDA` → forçar fim
- [ ] Listener para `BOMBA_RESFRIADA` → adicionar tempo
- [ ] Feedback visual (toasts/alerts)

### Fase 6: Integração com ResultScreen
**Tempo estimado:** 1 hora

- [ ] Listener para `BOMBA_DESARMADA` → confirmar desarme
- [ ] Timeout de segurança (5s)
- [ ] Mostrar tempo final

### Fase 7: Testes e Documentação
**Tempo estimado:** 2 horas

- [ ] Testar fluxo completo em mock
- [ ] Testar com ESP32 real (se disponível)
- [ ] Documentar uso para desenvolvedores
- [ ] Atualizar `LEADER_VS_PARTICIPANT_FLOW.md`

**Tempo total estimado: 13-15 horas**

---

## 🧪 Como Testar (Modo Mock)

### Simular Notificação Manualmente

```typescript
// No código (para debug):
bluetoothService.simulateNotification({
  type: 'BOMBA_RESFRIADA',
  timestamp: Date.now(),
  data: { segundosAdicionados: 30 }
});
```

### Tela de Debug (ControlScreen)

Adicionar botões para simular notificações:

```typescript
// ControlScreen.tsx - Novos botões
<Button
  title="Simular: Bomba Resfriada (+30s)"
  onPress={() => {
    bluetoothService.simulateNotification({
      type: 'BOMBA_RESFRIADA',
      timestamp: Date.now(),
      data: { segundosAdicionados: 30 }
    });
  }}
/>

<Button
  title="Simular: Bomba Desarmada"
  onPress={() => {
    bluetoothService.simulateNotification({
      type: 'BOMBA_DESARMADA',
      timestamp: Date.now(),
      data: { tempoFinal: 123 }
    });
  }}
/>
```

---

## 🔧 Firmware ESP32 (Exemplo)

### Enviar Notificação Timer Update

```cpp
// ESP32 - Código exemplo
void sendTimerUpdate(int segundosRestantes) {
  // Criar JSON
  StaticJsonDocument<200> doc;
  doc["type"] = "TEMPO_ATUALIZADO";
  doc["timestamp"] = millis();
  doc["data"]["segundosRestantes"] = segundosRestantes;
  
  // Serializar
  String json;
  serializeJson(doc, json);
  
  // Enviar via BLE Notify Characteristic
  pNotifyCharacteristic->setValue(json.c_str());
  pNotifyCharacteristic->notify();
}

void loop() {
  // A cada 5 segundos, enviar update
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 5000) {
    sendTimerUpdate(getSecondsRemaining());
    lastUpdate = millis();
  }
}
```

### Enviar Notificação Bomba Desarmada

```cpp
void onBombDisarmed() {
  StaticJsonDocument<200> doc;
  doc["type"] = "BOMBA_DESARMADA";
  doc["timestamp"] = millis();
  doc["data"]["tempoFinal"] = getSecondsRemaining();
  
  String json;
  serializeJson(doc, json);
  
  pNotifyCharacteristic->setValue(json.c_str());
  pNotifyCharacteristic->notify();
}
```

---

## 📊 Fluxo de Notificações - Diagrama

```
┌─────────────────────────────────────────────────────────────┐
│                       JOGO INICIADO                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ App → ESP32      │
                    │ Comando: INICIAR │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ ESP32 → App      │
                    │ TEMPO_ATUALIZADO │
                    │ (600 segundos)   │
                    └──────────────────┘
                              │
                              ▼
            ┌─────────────────┴─────────────────┐
            │                                   │
    ┌───────▼────────┐              ┌──────────▼─────────┐
    │ Jogador ERRA   │              │  Item Especial     │
    │ Pergunta       │              │  Usado             │
    └───────┬────────┘              └──────────┬─────────┘
            │                                   │
            ▼                                   ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ App → ESP32      │            │ ESP32 → App      │
    │ Comando: ACELERAR│            │ BOMBA_RESFRIADA  │
    └──────────────────┘            │ (+30 segundos)   │
                                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ ESP32 → App      │
                    │ TEMPO_ATUALIZADO │
                    │ (540 segundos)   │
                    └──────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
    ┌───────▼────────┐              ┌──────────▼─────────┐
    │ Jogador        │              │  Tempo             │
    │ FINALIZA       │              │  ACABOU            │
    └───────┬────────┘              └──────────┬─────────┘
            │                                   │
    ┌───────▼────────┐              ┌──────────▼─────────┐
    │ Pelo menos 1   │              │  Timeout           │
    │ correta        │              │  0 segundos        │
    └───────┬────────┘              └──────────┬─────────┘
            │                                   │
            ▼                                   ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ App → ESP32      │            │ App → ESP32      │
    │ Comando: DESARMAR│            │ Comando: EXPLODIR│
    └──────────────────┘            └──────────────────┘
            │                                   │
            ▼                                   ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ ESP32 → App      │            │ ESP32 → App      │
    │ BOMBA_DESARMADA  │            │ BOMBA_EXPLODIDA  │
    │ (tempoFinal: 123)│            │ (motivo: timeout)│
    └──────────────────┘            └──────────────────┘
            │                                   │
            └──────────────┬────────────────────┘
                           ▼
                    ┌──────────────────┐
                    │  FIM DO JOGO     │
                    └──────────────────┘
```

---

## ⚠️ Considerações Importantes

### 1. **Frequência de Timer Updates**
- ❌ **Não enviar a cada 1 segundo** → muitas notificações, gasta bateria
- ✅ **Enviar a cada 5 segundos** → suficiente para sincronização
- ✅ **Ou apenas em eventos importantes** (acelerar, resfriar)

### 2. **Tamanho do Payload**
- BLE tem limite de ~20 bytes por notificação (sem MTU negociado)
- Com MTU 185, pode enviar ~165 bytes
- JSON compacto é essencial

### 3. **Reliability**
- BLE Notifications não garantem entrega
- Implementar timeout no app (se não receber confirmação em 5s, considerar sucesso/falha)

### 4. **Modo Mock**
- **Essencial para desenvolvimento** sem ESP32
- Auto-responder a comandos com notificações simuladas
- Delays realistas (~300ms)

---

## 📁 Arquivos a Criar/Modificar

### Criar:
- `mobile/types/bluetooth.ts` (tipos de notificações)

### Modificar:
- `mobile/services/BluetoothService.ts` (adicionar listeners e monitoring)
- `mobile/screens/QuizScreen.tsx` (listeners de notificações)
- `mobile/screens/ResultScreen.tsx` (listener de desarme)
- `mobile/screens/ControlScreen.tsx` (botões de debug)
- `mobile/docs/BLUETOOTH_NOTIFICATIONS_PLAN.md` (este documento)

---

## 🔗 Referências Técnicas

- **react-native-ble-plx Docs:** https://github.com/dotintent/react-native-ble-plx
- **BLE Notifications:** https://www.bluetooth.com/blog/a-developers-guide-to-bluetooth/
- **ESP32 BLE Server:** https://github.com/nkolban/ESP32_BLE_Arduino

---

**Plano completo criado! Pronto para implementação. 🚀**

*Próximo passo: Aprovação e início da Fase 1 (Tipos e Estrutura Base)*

