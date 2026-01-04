# 🏠 Sistema de Sala por Cabine (Cabin Room System)

## 📋 Visão Geral

Sistema que gerencia a formação de times baseado em cabines físicas. Quando múltiplos jogadores escaneiam o QR Code da mesma cabine:
- **Primeiro jogador** = **Líder** (cria o time)
- **Demais jogadores** = **Participantes** (entram automaticamente no time do líder)

---

## 🎯 Objetivos

1. ✅ Evitar conflitos de múltiplos jogadores criando times diferentes para a mesma cabine
2. ✅ Criar experiência fluida onde jogadores se juntam automaticamente
3. ✅ Manter sincronia entre todos os participantes via WebSocket
4. ✅ Garantir que apenas um time use cada cabine por vez

---

## 🔄 Fluxo Completo

### **Cenário: 3 Jogadores Escaneiam Mesma Cabine**

```
TEMPO | JOGADOR 1 (Matheus)           | JOGADOR 2 (Rafa)              | JOGADOR 3 (Victor)
------|--------------------------------|-------------------------------|--------------------------------
T0    | Escaneia QR cabineId:5        |                               |
T1    | Login "Matheus"               |                               |
T2    | WS: joinCabinRoom(5)          |                               |
T3    | Backend: "Você é o LÍDER"     |                               |
T4    | TeamsMain (cria time)         | Escaneia QR cabineId:5        |
T5    | Cria time "Ninjas"            | Login "Rafa"                  |
T6    | Backend: cabine5→time10       | WS: joinCabinRoom(5)          |
T7    | Navega para Lobby             | Backend: "PARTICIPANTE"       |
T8    | Aguarda jogadores...          | Auto-join time "Ninjas"       | Escaneia QR cabineId:5
T9    | 📢 "Rafa entrou!"             | Navega para Lobby             | Login "Victor"
T10   |                               |                               | WS: joinCabinRoom(5)
T11   |                               |                               | Backend: "PARTICIPANTE"
T12   | 📢 "Victor entrou!"           | 📢 "Victor entrou!"           | Auto-join time "Ninjas"
T13   | [Iniciar Desafio] button      |                               | Navega para Lobby
T14   | Todos conectam Bluetooth      | Todos conectam Bluetooth      | Todos conectam Bluetooth
T15   | ➡️ Quiz inicia                | ➡️ Quiz inicia                | ➡️ Quiz inicia
```

---

## 📱 Fluxo de Telas

### **Fluxo Líder (Primeiro a Escanear)**

```
1. QRCodeScannerScreen
   ↓ Escaneia: { cabineId: 5, bluetoothName: "ESP32_01" }
   
2. LoginScreen
   ↓ Digite nickname: "Matheus"
   
3. CabinLobbyScreen
   ↓ WS: joinCabinRoom(cabineId: 5)
   ↓ Recebe: { role: "leader", cabinStatus: "empty" }
   ↓ Mostra: "Você é o líder! Crie um time."
   
4. TeamsMainScreen
   ↓ Escolhe: "Criar Time"
   
5. CreateTeamScreen
   ↓ Cria time "Ninjas"
   ↓ WS: createTime({ nome: "Ninjas", cabineId: 5 })
   ↓ Backend vincula: cabineId:5 → timeId:10
   
6. LobbyScreen (Team Lobby)
   ↓ Aguarda participantes
   ↓ Recebe broadcasts: playerJoined
   ↓ Lista jogadores em tempo real
   ↓ Botão "Iniciar Desafio" (só para líder)
   
7. BluetoothConnectingScreen
   ↓ Conexão automática com ESP32_01
   
8. QuizScreen
```

### **Fluxo Participante (Segundo+ a Escanear)**

```
1. QRCodeScannerScreen
   ↓ Escaneia: { cabineId: 5, bluetoothName: "ESP32_01" }
   
2. LoginScreen
   ↓ Digite nickname: "Rafa"
   
3. CabinLobbyScreen
   ↓ WS: joinCabinRoom(cabineId: 5)
   ↓ Recebe: { 
       role: "participant",
       cabinStatus: "active",
       teamId: 10,
       teamName: "Ninjas",
       leader: "Matheus"
     }
   ↓ Mostra: "Entrando no time Ninjas..."
   ↓ WS: joinTeam({ teamId: 10 })
   ↓ PULA TeamsMainScreen ✅
   
4. LobbyScreen (Team Lobby)
   ↓ Lista todos os jogadores
   ↓ Aguarda líder iniciar
   ↓ Botão "Iniciar Desafio" desabilitado
   
5. BluetoothConnectingScreen
   ↓ (quando líder iniciar)
   
6. QuizScreen
```

---

## 🌐 WebSocket: `/ws/cabin`

### **Conexão**

```typescript
// URL
wss://rodarico.app.br/ws/cabin?token={JWT_TOKEN}

// Cliente conecta após login
await wsService.connect('cabin');
```

---

### **📤 Mensagens: Cliente → Servidor**

#### **1. `joinCabinRoom` - Entrar na Sala da Cabine**

```typescript
{
  "action": "joinCabinRoom",
  "data": {
    "cabineId": 5
  }
}
```

**Comportamento Backend:**
- Se cabine está vazia (nenhum time ativo):
  - Define cliente como **LÍDER**
  - Cria entrada no estado da cabine
  - Responde com `role: "leader"`
  
- Se cabine já tem time ativo:
  - Define cliente como **PARTICIPANTE**
  - Adiciona à lista de espera
  - Responde com dados do time existente
  - Faz broadcast para outros membros

---

#### **2. `leaveCabinRoom` - Sair da Sala da Cabine**

```typescript
{
  "action": "leaveCabinRoom",
  "data": {
    "cabineId": 5
  }
}
```

**Comportamento Backend:**
- Remove jogador da sala
- Broadcast para outros: `playerLeft`
- Se era o líder E time não foi criado ainda:
  - Promove próximo jogador a líder
  - Envia `promotedToLeader`
- Se era o líder E time já foi criado:
  - Promove próximo jogador a líder
  - OU marca cabine como "órfã" (decidir)

---

#### **3. `createTeamForCabin` - Criar Time (só líder)**

```typescript
{
  "action": "createTeamForCabin",
  "data": {
    "cabineId": 5,
    "teamName": "Ninjas"
  }
}
```

**Comportamento Backend:**
- Valida que cliente é o líder da cabine
- Cria time no banco de dados
- Vincula cabineId → teamId
- Atualiza estado da cabine: `status: "active"`
- Broadcast para sala: `teamCreated`
- Adiciona todos os participantes em espera ao time

---

#### **4. `startGameForCabin` - Iniciar Jogo (só líder)**

```typescript
{
  "action": "startGameForCabin",
  "data": {
    "cabineId": 5
  }
}
```

**Comportamento Backend:**
- Valida que cliente é o líder
- Valida que time tem pelo menos 1 jogador
- Cria partida no banco: `iniciarPartida(timeId, cabineId)`
- Atualiza estado: `status: "playing"`
- Broadcast para sala: `gameStarting`

---

### **📥 Mensagens: Servidor → Cliente**

#### **1. `cabinRoomJoined` - Confirmação de Entrada**

**Resposta para `joinCabinRoom`**

**Caso 1: Líder (cabine vazia)**
```typescript
{
  "action": "cabinRoomJoined",
  "success": true,
  "data": {
    "role": "leader",
    "cabinId": 5,
    "cabinStatus": "empty",
    "message": "Você é o líder desta cabine. Crie um time!",
    "playersInRoom": [
      { "id": 1, "nickname": "Matheus", "isLeader": true }
    ]
  }
}
```

**Caso 2: Participante (cabine com time)**
```typescript
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
    "message": "Você entrou no time Ninjas!",
    "playersInRoom": [
      { "id": 1, "nickname": "Matheus", "isLeader": true },
      { "id": 2, "nickname": "Rafa", "isLeader": false }
    ]
  }
}
```

**Caso 3: Erro (cabine em jogo)**
```typescript
{
  "action": "cabinRoomJoined",
  "success": false,
  "error": "CABIN_IN_GAME",
  "message": "Esta cabine já está em jogo. Aguarde finalizar.",
  "data": {
    "cabinStatus": "playing"
  }
}
```

---

#### **2. `playerJoined` - Broadcast Novo Jogador**

**Enviado para todos na sala quando alguém entra**

```typescript
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
  }
}
```

---

#### **3. `playerLeft` - Broadcast Jogador Saiu**

```typescript
{
  "action": "playerLeft",
  "data": {
    "playerId": 2,
    "nickname": "Rafa",
    "cabinId": 5,
    "totalPlayers": 2,
    "playersInRoom": [
      { "id": 1, "nickname": "Matheus", "isLeader": true },
      { "id": 3, "nickname": "Victor", "isLeader": false }
    ]
  }
}
```

---

#### **4. `teamCreated` - Broadcast Time Criado**

**Enviado quando líder cria o time**

```typescript
{
  "action": "teamCreated",
  "data": {
    "teamId": 10,
    "teamName": "Ninjas",
    "cabinId": 5,
    "leaderId": 1,
    "leaderNickname": "Matheus",
    "message": "Time Ninjas foi criado!",
    "allPlayersAdded": true
  }
}
```

---

#### **5. `gameStarting` - Broadcast Jogo Iniciando**

**Enviado quando líder inicia o desafio**

```typescript
{
  "action": "gameStarting",
  "data": {
    "partidaId": 42,
    "teamId": 10,
    "cabinId": 5,
    "codigo": "ABC123",
    "message": "O desafio está começando!",
    "countdownSeconds": 3
  }
}
```

---

#### **6. `promotedToLeader` - Você foi Promovido**

**Enviado quando líder sai e você vira o novo líder**

```typescript
{
  "action": "promotedToLeader",
  "data": {
    "cabinId": 5,
    "previousLeader": "Matheus",
    "message": "Você agora é o líder do time!",
    "playersInRoom": [
      { "id": 2, "nickname": "Rafa", "isLeader": true },
      { "id": 3, "nickname": "Victor", "isLeader": false }
    ]
  }
}
```

---

#### **7. `error` - Erro Genérico**

```typescript
{
  "action": "error",
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "Apenas o líder pode iniciar o jogo",
  "data": {
    "requiredRole": "leader",
    "yourRole": "participant"
  }
}
```

---

## 🗂️ Estruturas de Dados

### **Backend State: `CabinRoom`**

```typescript
interface CabinRoom {
  cabinId: number;
  status: 'empty' | 'waiting' | 'active' | 'playing' | 'finished';
  
  // Team info (null se ainda não criado)
  teamId: number | null;
  teamName: string | null;
  
  // Leader info
  leaderId: number;
  leaderNickname: string;
  leaderSocketId: string;
  
  // Participants
  participants: CabinParticipant[];
  
  // Game info
  partidaId: number | null;
  
  // Metadata
  createdAt: Date;
  lastActivity: Date;
  
  // Bluetooth
  bluetoothDeviceName: string;
}

interface CabinParticipant {
  playerId: number;
  nickname: string;
  socketId: string;
  joinedAt: Date;
  isLeader: boolean;
}
```

**Estados da Cabine:**
- `empty`: Sem jogadores
- `waiting`: Tem líder, mas time ainda não foi criado
- `active`: Time criado, aguardando iniciar jogo
- `playing`: Jogo em andamento
- `finished`: Jogo finalizado (libera cabine)

---

### **Frontend Context: Adições ao `GameContext`**

```typescript
interface GameContextType {
  // ... existentes
  
  // Novos para Cabin Room
  cabinRole: 'leader' | 'participant' | null;
  setCabinRole: (role: 'leader' | 'participant' | null) => void;
  
  bluetoothDeviceName: string | null;
  setBluetoothDeviceName: (name: string | null) => void;
  
  playersInCabin: CabinParticipant[];
  setPlayersInCabin: (players: CabinParticipant[]) => void;
  
  cabinStatus: 'empty' | 'waiting' | 'active' | 'playing' | 'finished';
  setCabinStatus: (status: string) => void;
}
```

---

## 🎬 Casos de Uso Detalhados

### **Caso 1: Líder Cria Time e Inicia Jogo**

```
1. Matheus escaneia QR → cabineId: 5
2. Login: "Matheus"
3. WS: joinCabinRoom(5)
   ← cabinRoomJoined { role: "leader", cabinStatus: "empty" }
4. TeamsMain → Criar Time
5. Digita: "Ninjas"
6. WS: createTeamForCabin(5, "Ninjas")
   ← teamCreated { teamId: 10, teamName: "Ninjas" }
7. Navega para Lobby
8. Aguarda jogadores...
9. Rafa entra:
   ← playerJoined { nickname: "Rafa" }
10. Matheus clica "Iniciar Desafio"
11. WS: startGameForCabin(5)
    ← gameStarting { partidaId: 42 }
12. Todos navegam para BluetoothConnecting → Quiz
```

---

### **Caso 2: Participante Entra em Time Existente**

```
1. Rafa escaneia QR → cabineId: 5 (já tem time "Ninjas")
2. Login: "Rafa"
3. WS: joinCabinRoom(5)
   ← cabinRoomJoined { 
       role: "participant",
       teamId: 10,
       teamName: "Ninjas",
       leader: "Matheus"
     }
4. PULA TeamsMain ✅
5. Navega direto para Lobby
6. Vê lista de jogadores: ["Matheus (Líder)", "Rafa (Você)"]
7. Aguarda líder iniciar...
8. Recebe gameStarting → Navega para Quiz
```

---

### **Caso 3: Líder Sai Antes de Criar Time**

```
1. Matheus entra como líder (cabineId: 5)
2. Rafa entra como participante
3. Matheus fecha o app ❌
4. Backend detecta desconexão
5. Backend promove Rafa a líder:
   → promotedToLeader (para Rafa)
6. Rafa recebe notificação: "Você agora é o líder!"
7. Navega para TeamsMain → Cria time
```

---

### **Caso 4: Tentativa de Entrar em Cabine em Jogo**

```
1. Victor escaneia QR → cabineId: 5 (já está playing)
2. Login: "Victor"
3. WS: joinCabinRoom(5)
   ← cabinRoomJoined { 
       success: false,
       error: "CABIN_IN_GAME",
       message: "Esta cabine já está em uso"
     }
4. App mostra erro amigável:
   "Esta cabine está ocupada. Aguarde ou escolha outra."
5. Botões: [Tentar Outra Cabine] [Aguardar]
```

---

### **Caso 5: Modo Mock (Teste Sem Backend)**

```
1. App detecta flag mockMode = true
2. QRCodeScanner tem botão "Gerar Cabine Mock"
3. Clica → gera cabineId aleatório (ex: 999)
4. Login normalmente
5. CabinLobbyScreen simula resposta:
   - 50% chance: líder
   - 50% chance: participante (com dados fake)
6. Fluxo continua normalmente (WebSocket mockado)
```

---

## ⚠️ Tratamento de Erros

### **Erros Possíveis**

| Código | Mensagem | Ação |
|--------|----------|------|
| `CABIN_IN_GAME` | Cabine já está em jogo | Mostrar erro, voltar para QR Scanner |
| `CABIN_NOT_FOUND` | Cabine não existe | Verificar QR Code, tentar novamente |
| `PERMISSION_DENIED` | Só líder pode fazer isso | Desabilitar botão para participantes |
| `TEAM_ALREADY_EXISTS` | Líder já criou time | Navegar para Lobby |
| `WEBSOCKET_DISCONNECTED` | Conexão perdida | Tentar reconectar automaticamente |
| `INVALID_CABIN_ID` | ID de cabine inválido | QR Code corrompido, escanear novamente |

---

## 🧪 Cenários de Teste

### **Testes Funcionais**

```
✅ T1: Primeiro jogador vira líder
✅ T2: Segundo jogador vira participante
✅ T3: Líder cria time com sucesso
✅ T4: Participantes recebem broadcast de teamCreated
✅ T5: Líder inicia jogo, todos navegam para Quiz
✅ T6: Líder sai antes de criar time → participante promovido
✅ T7: Tentar entrar em cabine em jogo → erro
✅ T8: Desconexão/reconexão mantém estado
✅ T9: 5 jogadores entram simultaneamente → 1 líder, 4 participantes
✅ T10: Modo mock funciona sem backend
```

### **Testes de Concorrência**

```
✅ C1: 2 jogadores escaneiam exatamente ao mesmo tempo
      → Backend garante que apenas 1 vira líder (lock de mutex)
      
✅ C2: Líder cria time E sai ao mesmo tempo
      → Participante promovido recebe teamId correto
      
✅ C3: Múltiplos jogadores entram durante createTeam
      → Todos são adicionados ao time após criação
```

---

## 🔒 Segurança

### **Validações Backend**

```typescript
// Apenas líder pode criar time
if (action === 'createTeamForCabin') {
  if (session.cabinRole !== 'leader') {
    throw new Error('PERMISSION_DENIED');
  }
}

// Apenas líder pode iniciar jogo
if (action === 'startGameForCabin') {
  if (session.cabinRole !== 'leader') {
    throw new Error('PERMISSION_DENIED');
  }
}

// Validar que cabine não está em uso
if (cabinRoom.status === 'playing') {
  throw new Error('CABIN_IN_GAME');
}

// Rate limiting: max 1 createTeam por segundo
if (lastActionTime < Date.now() - 1000) {
  throw new Error('RATE_LIMIT');
}
```

---

## 📊 Métricas e Logs

### **Logs Importantes**

```typescript
// Backend logs
LOG: "Cabin 5: Matheus joined as LEADER"
LOG: "Cabin 5: Rafa joined as PARTICIPANT (team: Ninjas)"
LOG: "Cabin 5: Team 'Ninjas' created by Matheus"
LOG: "Cabin 5: Game starting with 3 players"
LOG: "Cabin 5: Game finished (success: true)"
LOG: "Cabin 5: Released (status: finished)"
```

### **Métricas**

- Tempo médio entre scan QR e criação de time
- Taxa de desistência (jogadores que saem antes do jogo)
- Número médio de jogadores por cabine
- Tempo médio de jogo por cabine
- Taxa de reconexões por problemas de rede

---

## 🚀 Timeline de Implementação

### **Fase 1: Backend WebSocket (Critical Path)**
```
- [ ] Criar endpoint /ws/cabin
- [ ] Implementar lógica de joinCabinRoom
- [ ] Implementar sistema de líder/participante
- [ ] Implementar broadcasts (playerJoined, teamCreated, etc)
- [ ] Testes de concorrência
- [ ] Deploy em ambiente de staging
```

### **Fase 2: Frontend (Dependente da Fase 1)**
```
- [ ] Criar QRCodeScannerScreen
- [ ] Criar CabinLobbyScreen
- [ ] Atualizar GameContext
- [ ] Integrar WebSocket /ws/cabin
- [ ] Refatorar LobbyScreen
- [ ] Criar modo mock para testes locais
```

### **Fase 3: Testes E2E**
```
- [ ] Teste com 2 dispositivos reais
- [ ] Teste com 5 dispositivos simultâneos
- [ ] Teste de desconexão/reconexão
- [ ] Teste de promoção de líder
- [ ] Load test (10 cabines simultâneas)
```

---

## 📝 Notas de Implementação

### **Backend - Estado em Memória vs Persistente**

**Recomendação: Redis + PostgreSQL**
- Redis: Estado temporário da CabinRoom (rápido, TTL automático)
- PostgreSQL: Times e Partidas (persistente)

```typescript
// Redis Key Structure
cabin_room:{cabinId} → CabinRoom JSON
cabin_locks:{cabinId} → mutex para evitar race conditions
player_cabin:{playerId} → cabinId (reverse lookup)

// TTL: 1 hora (libera cabine automaticamente se esquecerem)
```

---

### **Frontend - Reconexão Automática**

```typescript
// Se WebSocket desconectar durante CabinLobby
wsService.onConnectionChange((connected) => {
  if (!connected && currentScreen === 'CabinLobby') {
    // Tentar reconectar e re-join
    setTimeout(async () => {
      await wsService.connect('cabin');
      wsService.send({
        action: 'joinCabinRoom',
        data: { cabineId: gameContext.cabineId }
      });
    }, 2000);
  }
});
```

---

## 🎨 UX Considerations

### **CabinLobbyScreen: Estados Visuais**

```
Estado 1: Conectando
  - Spinner animado
  - "Conectando à cabine #5..."
  
Estado 2: Líder Detectado
  - Ícone de coroa 👑
  - "Você é o líder! Crie um time."
  - Botão [Criar Time]
  
Estado 3: Participante Detectado
  - Ícone de time 👥
  - "Entrando no time Ninjas..."
  - Auto-navegação (2s)
  
Estado 4: Erro
  - Ícone de erro ⚠️
  - Mensagem específica
  - Botões: [Voltar] [Tentar Novamente]
```

---

## 🔮 Futuras Melhorias (v2)

1. **Convite por Link**: Líder gera link único que outros podem clicar (alternativa ao QR)
2. **Limite de Jogadores**: Configurar max 4 jogadores por cabine
3. **Kick Player**: Líder pode remover jogadores
4. **Transferir Liderança**: Líder pode passar liderança manualmente
5. **Chat Pré-Jogo**: Mensagens entre jogadores no Lobby
6. **Histórico de Cabine**: Ver quem usou cabine recentemente

---

## 📚 Referências

- WebSocket Spec: `/mobile/services/WebSocketService.ts`
- Game Context: `/mobile/context/GameContext.tsx`
- QR Code Format: Definido no hardware ESP32

---

**Documentação criada em:** 2026-01-04
**Versão:** 1.0
**Status:** 📝 Em Review (aguardando aprovação para implementação)

