# 🌐 WebSocket Cabin API - Especificação Técnica

## 📡 Endpoint

```
wss://rodarico.app.br/ws/cabin?token={JWT_TOKEN}
```

### **Autenticação**

```typescript
// 1. Obter token via AuthService (já implementado)
const token = await AuthService.getAccessToken();

// 2. Conectar WebSocket
const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
const ws = new WebSocket(`wss://rodarico.app.br/ws/cabin?token=${cleanToken}`);
```

---

## 📋 Formato de Mensagens

### **Padrão de Request (Cliente → Servidor)**

```typescript
interface WSRequest {
  action: string;           // Nome da ação (ex: "joinCabinRoom")
  data: Record<string, any>; // Payload específico da ação
}
```

### **Padrão de Response (Servidor → Cliente)**

```typescript
interface WSResponse {
  action: string;           // Mesma action do request (ou broadcast event)
  success: boolean;         // true/false
  data?: Record<string, any>; // Dados de resposta (se success=true)
  error?: string;           // Código de erro (se success=false)
  message?: string;         // Mensagem legível para usuário
  timestamp?: string;       // ISO 8601 datetime
}
```

---

## 🔌 Ciclo de Vida da Conexão

### **1. Conexão Estabelecida**

```typescript
// Servidor envia após aceitar conexão
{
  "action": "connected",
  "success": true,
  "data": {
    "userId": 123,
    "nickname": "Matheus",
    "serverTime": "2026-01-04T15:30:00Z"
  },
  "message": "Conectado ao servidor de cabines"
}
```

### **2. Heartbeat (Keepalive)**

```typescript
// Cliente envia a cada 30 segundos
{
  "action": "ping",
  "data": {}
}

// Servidor responde
{
  "action": "pong",
  "success": true,
  "timestamp": "2026-01-04T15:30:30Z"
}
```

### **3. Desconexão Graceful**

```typescript
// Cliente envia antes de fechar
{
  "action": "disconnect",
  "data": {
    "reason": "user_logout" // ou "app_closed", "network_issue"
  }
}

// Servidor confirma
{
  "action": "disconnected",
  "success": true,
  "message": "Desconectado com sucesso"
}
```

---

## 📤 Actions: Cliente → Servidor

### **1. `joinCabinRoom`**

**Descrição:** Entrar na sala virtual de uma cabine

**Request:**
```json
{
  "action": "joinCabinRoom",
  "data": {
    "cabineId": 5
  }
}
```

**Response Success (Líder):**
```json
{
  "action": "cabinRoomJoined",
  "success": true,
  "data": {
    "role": "leader",
    "cabinId": 5,
    "cabinStatus": "empty",
    "playersInRoom": [
      {
        "id": 1,
        "nickname": "Matheus",
        "isLeader": true,
        "joinedAt": "2026-01-04T15:30:00Z"
      }
    ],
    "bluetoothDeviceName": "ESP32_BOMB_05"
  },
  "message": "Você é o líder desta cabine. Crie um time!",
  "timestamp": "2026-01-04T15:30:00Z"
}
```

**Response Success (Participante):**
```json
{
  "action": "cabinRoomJoined",
  "success": true,
  "data": {
    "role": "participant",
    "cabinId": 5,
    "cabinStatus": "active",
    "teamId": 10,
    "teamName": "Ninjas",
    "leaderId": 1,
    "leaderNickname": "Matheus",
    "playersInRoom": [
      {
        "id": 1,
        "nickname": "Matheus",
        "isLeader": true,
        "joinedAt": "2026-01-04T15:30:00Z"
      },
      {
        "id": 2,
        "nickname": "Rafa",
        "isLeader": false,
        "joinedAt": "2026-01-04T15:31:00Z"
      }
    ],
    "bluetoothDeviceName": "ESP32_BOMB_05"
  },
  "message": "Você entrou no time Ninjas!",
  "timestamp": "2026-01-04T15:31:00Z"
}
```

**Response Error (Cabine em Jogo):**
```json
{
  "action": "cabinRoomJoined",
  "success": false,
  "error": "CABIN_IN_GAME",
  "message": "Esta cabine já está em jogo. Aguarde finalizar.",
  "data": {
    "cabinStatus": "playing",
    "estimatedEndTime": "2026-01-04T15:45:00Z"
  },
  "timestamp": "2026-01-04T15:31:00Z"
}
```

**Response Error (Cabine Não Encontrada):**
```json
{
  "action": "cabinRoomJoined",
  "success": false,
  "error": "CABIN_NOT_FOUND",
  "message": "Cabine ID 999 não encontrada no sistema",
  "timestamp": "2026-01-04T15:31:00Z"
}
```

---

### **2. `leaveCabinRoom`**

**Descrição:** Sair da sala da cabine

**Request:**
```json
{
  "action": "leaveCabinRoom",
  "data": {
    "cabineId": 5,
    "reason": "manual_leave"
  }
}
```

**Response:**
```json
{
  "action": "cabinRoomLeft",
  "success": true,
  "message": "Você saiu da cabine 5",
  "timestamp": "2026-01-04T15:32:00Z"
}
```

---

### **3. `createTeamForCabin`**

**Descrição:** Criar time associado à cabine (apenas líder)

**Request:**
```json
{
  "action": "createTeamForCabin",
  "data": {
    "cabineId": 5,
    "teamName": "Ninjas"
  }
}
```

**Response Success:**
```json
{
  "action": "teamCreatedResponse",
  "success": true,
  "data": {
    "teamId": 10,
    "teamName": "Ninjas",
    "cabinId": 5,
    "leaderId": 1,
    "leaderNickname": "Matheus",
    "participants": [
      { "id": 1, "nickname": "Matheus" },
      { "id": 2, "nickname": "Rafa" },
      { "id": 3, "nickname": "Victor" }
    ],
    "createdAt": "2026-01-04T15:33:00Z"
  },
  "message": "Time 'Ninjas' criado com sucesso!",
  "timestamp": "2026-01-04T15:33:00Z"
}
```

**Response Error (Não é Líder):**
```json
{
  "action": "teamCreatedResponse",
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "Apenas o líder pode criar o time",
  "data": {
    "requiredRole": "leader",
    "yourRole": "participant"
  },
  "timestamp": "2026-01-04T15:33:00Z"
}
```

**Response Error (Time Já Existe):**
```json
{
  "action": "teamCreatedResponse",
  "success": false,
  "error": "TEAM_ALREADY_EXISTS",
  "message": "Esta cabine já possui um time ativo",
  "data": {
    "existingTeamId": 10,
    "existingTeamName": "Ninjas"
  },
  "timestamp": "2026-01-04T15:33:00Z"
}
```

---

### **4. `startGameForCabin`**

**Descrição:** Iniciar partida (apenas líder)

**Request:**
```json
{
  "action": "startGameForCabin",
  "data": {
    "cabineId": 5
  }
}
```

**Response Success:**
```json
{
  "action": "gameStartResponse",
  "success": true,
  "data": {
    "partidaId": 42,
    "teamId": 10,
    "cabinId": 5,
    "codigo": "ABC123",
    "startTime": "2026-01-04T15:35:00Z"
  },
  "message": "Partida iniciada! Boa sorte!",
  "timestamp": "2026-01-04T15:35:00Z"
}
```

**Response Error (Sem Jogadores):**
```json
{
  "action": "gameStartResponse",
  "success": false,
  "error": "NOT_ENOUGH_PLAYERS",
  "message": "É necessário pelo menos 1 jogador para iniciar",
  "data": {
    "currentPlayers": 0,
    "minimumPlayers": 1
  },
  "timestamp": "2026-01-04T15:35:00Z"
}
```

---

### **5. `getCabinStatus`**

**Descrição:** Obter status atual da cabine

**Request:**
```json
{
  "action": "getCabinStatus",
  "data": {
    "cabineId": 5
  }
}
```

**Response:**
```json
{
  "action": "cabinStatus",
  "success": true,
  "data": {
    "cabinId": 5,
    "status": "active",
    "teamId": 10,
    "teamName": "Ninjas",
    "playersCount": 3,
    "isPlaying": false,
    "bluetoothDeviceName": "ESP32_BOMB_05"
  },
  "timestamp": "2026-01-04T15:35:00Z"
}
```

---

## 📥 Broadcasts: Servidor → Todos na Sala

### **1. `playerJoined`**

**Descrição:** Novo jogador entrou na sala

```json
{
  "action": "playerJoined",
  "data": {
    "playerId": 3,
    "nickname": "Victor",
    "cabinId": 5,
    "totalPlayers": 3,
    "playersInRoom": [
      { "id": 1, "nickname": "Matheus", "isLeader": true },
      { "id": 2, "nickname": "Rafa", "isLeader": false },
      { "id": 3, "nickname": "Victor", "isLeader": false }
    ]
  },
  "message": "Victor entrou na sala",
  "timestamp": "2026-01-04T15:34:00Z"
}
```

---

### **2. `playerLeft`**

**Descrição:** Jogador saiu da sala

```json
{
  "action": "playerLeft",
  "data": {
    "playerId": 2,
    "nickname": "Rafa",
    "cabinId": 5,
    "totalPlayers": 2,
    "reason": "disconnected",
    "playersInRoom": [
      { "id": 1, "nickname": "Matheus", "isLeader": true },
      { "id": 3, "nickname": "Victor", "isLeader": false }
    ]
  },
  "message": "Rafa saiu da sala",
  "timestamp": "2026-01-04T15:36:00Z"
}
```

---

### **3. `teamCreated`**

**Descrição:** Líder criou o time

```json
{
  "action": "teamCreated",
  "data": {
    "teamId": 10,
    "teamName": "Ninjas",
    "cabinId": 5,
    "leaderId": 1,
    "leaderNickname": "Matheus",
    "allParticipants": [
      { "id": 1, "nickname": "Matheus" },
      { "id": 2, "nickname": "Rafa" },
      { "id": 3, "nickname": "Victor" }
    ]
  },
  "message": "Time 'Ninjas' foi criado!",
  "timestamp": "2026-01-04T15:33:00Z"
}
```

---

### **4. `gameStarting`**

**Descrição:** Jogo está iniciando (countdown)

```json
{
  "action": "gameStarting",
  "data": {
    "partidaId": 42,
    "teamId": 10,
    "cabinId": 5,
    "codigo": "ABC123",
    "countdownSeconds": 3,
    "startTime": "2026-01-04T15:35:03Z"
  },
  "message": "O desafio começa em 3 segundos!",
  "timestamp": "2026-01-04T15:35:00Z"
}
```

---

### **5. `promotedToLeader`**

**Descrição:** Você foi promovido a líder (líder anterior saiu)

```json
{
  "action": "promotedToLeader",
  "data": {
    "cabinId": 5,
    "previousLeaderId": 1,
    "previousLeaderNickname": "Matheus",
    "newLeaderId": 2,
    "newLeaderNickname": "Rafa",
    "playersInRoom": [
      { "id": 2, "nickname": "Rafa", "isLeader": true },
      { "id": 3, "nickname": "Victor", "isLeader": false }
    ]
  },
  "message": "Você agora é o líder do time!",
  "timestamp": "2026-01-04T15:37:00Z"
}
```

---

### **6. `leaderChanged`**

**Descrição:** Broadcast para participantes quando líder muda

```json
{
  "action": "leaderChanged",
  "data": {
    "cabinId": 5,
    "oldLeader": "Matheus",
    "newLeader": "Rafa",
    "newLeaderId": 2
  },
  "message": "Rafa agora é o líder do time",
  "timestamp": "2026-01-04T15:37:00Z"
}
```

---

## ⚠️ Códigos de Erro

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| `CABIN_NOT_FOUND` | Cabine não existe | Verificar QR Code, tentar novamente |
| `CABIN_IN_GAME` | Cabine ocupada (em jogo) | Aguardar ou escolher outra cabine |
| `CABIN_FINISHED` | Cabine foi finalizada | Escanear QR novamente |
| `PERMISSION_DENIED` | Ação requer ser líder | Mostrar mensagem de permissão |
| `TEAM_ALREADY_EXISTS` | Time já foi criado | Navegar para Lobby |
| `NOT_ENOUGH_PLAYERS` | Jogadores insuficientes | Aguardar mais jogadores |
| `INVALID_TEAM_NAME` | Nome de time inválido | Validar input (2-20 chars) |
| `PLAYER_ALREADY_IN_CABIN` | Já está em outra cabine | Sair da cabine atual primeiro |
| `WEBSOCKET_TIMEOUT` | Servidor não respondeu | Reconectar |
| `RATE_LIMIT_EXCEEDED` | Muitas requisições | Aguardar 1 segundo |
| `AUTHENTICATION_FAILED` | Token inválido | Fazer login novamente |
| `SERVER_ERROR` | Erro interno | Mostrar erro genérico, tentar novamente |

---

## 🔄 Fluxo de Reconexão

### **Cenário: WebSocket Desconecta Durante Lobby**

```typescript
// 1. Cliente detecta desconexão
wsService.onConnectionChange((connected) => {
  if (!connected && currentScreen === 'CabinLobby') {
    showReconnectingBanner();
  }
});

// 2. Tentar reconectar (backoff exponencial)
const delays = [1000, 2000, 4000, 8000]; // ms
for (const delay of delays) {
  await sleep(delay);
  try {
    await wsService.connect('cabin');
    break; // Sucesso
  } catch (error) {
    console.log('Retry failed');
  }
}

// 3. Após reconexão, re-join na mesma sala
wsService.send({
  action: 'joinCabinRoom',
  data: { cabineId: savedCabineId }
});

// 4. Backend retorna estado atual
// Cliente sincroniza: playersInRoom, teamId, etc
```

---

## 🧪 Ambiente de Desenvolvimento

### **Mock WebSocket Server (Local)**

```typescript
// Para testes locais sem backend
const mockWsServer = {
  connect: () => {
    setTimeout(() => {
      emit('connected', { userId: 999, nickname: 'MockUser' });
    }, 100);
  },
  
  joinCabinRoom: (cabineId: number) => {
    // 50% líder, 50% participante
    const isLeader = Math.random() > 0.5;
    
    setTimeout(() => {
      if (isLeader) {
        emit('cabinRoomJoined', {
          success: true,
          data: {
            role: 'leader',
            cabinId: cabineId,
            cabinStatus: 'empty',
            playersInRoom: [{ id: 999, nickname: 'MockUser', isLeader: true }]
          }
        });
      } else {
        emit('cabinRoomJoined', {
          success: true,
          data: {
            role: 'participant',
            cabinId: cabineId,
            cabinStatus: 'active',
            teamId: 1,
            teamName: 'Mock Team',
            playersInRoom: [
              { id: 1, nickname: 'Leader', isLeader: true },
              { id: 999, nickname: 'MockUser', isLeader: false }
            ]
          }
        });
      }
    }, 500);
  },
  
  // Simular broadcast após 3 segundos
  simulatePlayerJoin: () => {
    setTimeout(() => {
      emit('playerJoined', {
        data: {
          playerId: 888,
          nickname: 'RandomPlayer',
          totalPlayers: 3
        }
      });
    }, 3000);
  }
};
```

---

## 📊 Rate Limits

| Ação | Limite | Janela |
|------|--------|--------|
| `joinCabinRoom` | 5 tentativas | 1 minuto |
| `createTeamForCabin` | 3 tentativas | 30 segundos |
| `startGameForCabin` | 10 tentativas | 1 minuto |
| `ping` (heartbeat) | 1 por 10s | - |
| Todos os requests | 100 | 1 minuto |

**Resposta de Rate Limit:**
```json
{
  "action": "error",
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Muitas tentativas. Aguarde 30 segundos.",
  "data": {
    "retryAfter": 30,
    "retryAfterTimestamp": "2026-01-04T15:40:30Z"
  },
  "timestamp": "2026-01-04T15:40:00Z"
}
```

---

## 🔐 Validações

### **Backend Validations**

```typescript
// cabineId
- Tipo: number (integer)
- Range: 1 - 9999
- Required: true

// teamName
- Tipo: string
- Length: 2 - 30 caracteres
- Regex: /^[a-zA-Z0-9 _-]+$/
- Proibido: palavrões, termos ofensivos
- Required: true

// nickname (do token JWT)
- Tipo: string
- Length: 2 - 20 caracteres
- Regex: /^[a-zA-Z0-9_-]+$/
- Required: true (via auth)
```

---

## 📈 Logs e Monitoramento

### **Server-Side Logs**

```json
{
  "timestamp": "2026-01-04T15:30:00Z",
  "level": "info",
  "event": "cabin_room_joined",
  "data": {
    "userId": 1,
    "nickname": "Matheus",
    "cabinId": 5,
    "role": "leader",
    "ip": "192.168.1.100"
  }
}
```

### **Client-Side Logs**

```typescript
console.log('[WS Cabin] Conectando...');
console.log('[WS Cabin] Mensagem enviada:', JSON.stringify(message));
console.log('[WS Cabin] Resposta recebida:', JSON.stringify(response));
console.log('[WS Cabin] Desconectado. Motivo:', reason);
```

---

## 🧩 Integração com Sistema Existente

### **Compatibilidade com `/ws/time` e `/ws/partida`**

```typescript
// ANTES: Conectava direto ao /ws/time
await wsService.connect('time');
wsService.send({ action: 'createTime', data: { nome: 'Ninjas' } });

// AGORA: Usa /ws/cabin primeiro, depois /ws/partida
await wsService.connect('cabin');
wsService.send({ action: 'createTeamForCabin', data: { cabineId: 5, teamName: 'Ninjas' } });

// Quando iniciar jogo: switch para /ws/partida
wsService.disconnect(); // fecha /ws/cabin
await wsService.connect('partida');
wsService.send({ action: 'iniciarPartida', data: { timeId: 10, cabineId: 5 } });
```

---

## 🎯 Checklist de Implementação Backend

```
- [ ] Criar endpoint /ws/cabin no servidor
- [ ] Implementar autenticação JWT via query param
- [ ] Criar modelo CabinRoom (em memória ou Redis)
- [ ] Implementar lógica de líder/participante (mutex/lock)
- [ ] Implementar handlers:
  - [ ] joinCabinRoom
  - [ ] leaveCabinRoom
  - [ ] createTeamForCabin
  - [ ] startGameForCabin
  - [ ] getCabinStatus
- [ ] Implementar broadcasts:
  - [ ] playerJoined
  - [ ] playerLeft
  - [ ] teamCreated
  - [ ] gameStarting
  - [ ] promotedToLeader
- [ ] Implementar promoção automática de líder
- [ ] Implementar cleanup de salas vazias (TTL 1h)
- [ ] Implementar rate limiting
- [ ] Implementar validações de input
- [ ] Adicionar logs estruturados
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de carga (10 cabines simultâneas)
- [ ] Documentar API no Swagger/OpenAPI
- [ ] Deploy em staging
- [ ] Smoke tests em staging
- [ ] Deploy em produção
```

---

**API Version:** 1.0  
**Last Updated:** 2026-01-04  
**Status:** 📋 Especificação Completa - Pronta para Implementação

