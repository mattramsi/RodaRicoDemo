# 🚀 Guia de Implementação - Sistema de Sala por Cabine

## 📋 Índice
1. [Resumo Executivo](#resumo-executivo)
2. [Diagramas de Sequência](#diagramas-de-sequência)
3. [Checklist de Implementação](#checklist-de-implementação)
4. [Ordem de Desenvolvimento](#ordem-de-desenvolvimento)
5. [Estrutura de Arquivos](#estrutura-de-arquivos)
6. [Testes](#testes)
7. [Deploy](#deploy)

---

## 📝 Resumo Executivo

### **O que vamos construir?**

Sistema que permite múltiplos jogadores escanearem o QR Code da mesma cabine e formarem automaticamente um time, onde:
- **Primeiro jogador** vira **líder** (cria o time)
- **Demais jogadores** viram **participantes** (entram automaticamente)

### **Componentes Principais**

1. **Frontend (React Native):**
   - `QRCodeScannerScreen` - Escaneia QR Code da cabine
   - `CabinLobbyScreen` - Conecta ao WebSocket e determina role (líder/participante)
   - Refatoração de `LobbyScreen` - Remove input manual de cabineId
   - Atualizações em `GameContext` - Novos estados

2. **Backend (WebSocket):**
   - Novo endpoint `/ws/cabin`
   - Lógica de sala virtual por cabine
   - Sistema de líder/participante
   - Broadcasts em tempo real

3. **Hardware (ESP32):**
   - Geração de QR Code no formato JSON
   - Display do QR Code (OLED/E-Ink)

---

## 📊 Diagramas de Sequência

### **Diagrama 1: Fluxo Completo - Líder**

```
Jogador A          App               WebSocket          Backend          Database
   |                |                    |                 |                |
   |-- Escaneia QR Code ---------------->|                 |                |
   |                |                    |                 |                |
   |<-- cabineId:5, BT:ESP32_01 ---------|                 |                |
   |                |                    |                 |                |
   |-- Login "Matheus" ------------------>|                 |                |
   |                |                    |                 |                |
   |                |-- connect('/cabin') --------------->|                |
   |                |                    |                 |                |
   |                |<-- connected ---------------------|                |
   |                |                    |                 |                |
   |                |-- joinCabinRoom(5) --------------->|                |
   |                |                    |                 |                |
   |                |                    |-- checkCabin(5) ------------->|
   |                |                    |                 |                |
   |                |                    |<-- empty ----------------------|
   |                |                    |                 |                |
   |                |                    |-- setCabinLeader(5, userId:1) ->|
   |                |                    |                 |                |
   |                |<-- cabinRoomJoined(role:"leader") --|                |
   |                |                    |                 |                |
   |<-- "Você é o líder!" ---------------|                 |                |
   |                |                    |                 |                |
   |-- TeamsMain --->|                    |                 |                |
   |-- Criar Time "Ninjas" ------------>|                 |                |
   |                |                    |                 |                |
   |                |-- createTeamForCabin(5, "Ninjas") -->|                |
   |                |                    |                 |                |
   |                |                    |-- createTeam() --------------->|
   |                |                    |                 |                |
   |                |                    |<-- teamId:10 -------------------|
   |                |                    |                 |                |
   |                |                    |-- linkCabinToTeam(5, 10) ----->|
   |                |                    |                 |                |
   |                |<-- teamCreated(teamId:10) ----------|                |
   |                |                    |                 |                |
   |<-- Navega para Lobby ---------------|                 |                |
   |                |                    |                 |                |
   |-- Aguarda jogadores...              |                 |                |
```

### **Diagrama 2: Fluxo Completo - Participante**

```
Jogador B          App               WebSocket          Backend          Database
   |                |                    |                 |                |
   |-- Escaneia QR Code ---------------->|                 |                |
   |                |                    |                 |                |
   |<-- cabineId:5, BT:ESP32_01 ---------|                 |                |
   |                |                    |                 |                |
   |-- Login "Rafa" --------------------->|                 |                |
   |                |                    |                 |                |
   |                |-- connect('/cabin') --------------->|                |
   |                |                    |                 |                |
   |                |<-- connected ---------------------|                |
   |                |                    |                 |                |
   |                |-- joinCabinRoom(5) --------------->|                |
   |                |                    |                 |                |
   |                |                    |-- checkCabin(5) ------------->|
   |                |                    |                 |                |
   |                |                    |<-- active, teamId:10 ----------|
   |                |                    |                 |                |
   |                |                    |-- addToTeam(10, userId:2) ---->|
   |                |                    |                 |                |
   |                |<-- cabinRoomJoined(role:"participant", teamId:10) --|
   |                |                    |                 |                |
   |<-- "Entrando no time Ninjas..." ----|                 |                |
   |                |                    |                 |                |
   |-- PULA TeamsMain (auto-join) ----->|                 |                |
   |                |                    |                 |                |
   |<-- Navega para Lobby ---------------|                 |                |
   |                |                    |                 |                |
   |                |<-- playerJoined(Rafa) (broadcast) --|                |
   |                |                    |                 |                |
```

### **Diagrama 3: Broadcast - Novo Jogador**

```
Matheus (Líder)    Rafa (Part.)     Victor (Part.)    WebSocket         Backend
   |                |                |                    |                 |
   |                |                |-- joinCabinRoom(5) --------------->|
   |                |                |                    |                 |
   |                |                |                    |-- addToRoom() ->|
   |                |                |                    |                 |
   |<------------------- playerJoined(Victor) broadcast ------------------|
   |                |                |                    |                 |
   |<-- "Victor entrou!" ------------|                    |                 |
   |                |                |                    |                 |
   |-- Atualiza lista ------------->|                    |                 |
   |                |                |                    |                 |
   |                |<--------------- playerJoined(Victor) broadcast ------|
   |                |                |                    |                 |
   |                |<-- "Victor entrou!" ------------|                    |
   |                |                |                    |                 |
   |                |-- Atualiza lista -------------->|                    |
   |                |                |                    |                 |
   |                |                |<-- cabinRoomJoined (você) ---------|
   |                |                |                    |                 |
   |                |                |<-- "Bem-vindo!" ---|                |
```

### **Diagrama 4: Iniciar Jogo**

```
Líder              App               WebSocket          Backend          Bluetooth
   |                |                    |                 |                |
   |-- Clica "Iniciar Desafio" --------->|                 |                |
   |                |                    |                 |                |
   |                |-- startGameForCabin(5) ------------>|                |
   |                |                    |                 |                |
   |                |                    |-- createPartida(teamId:10) ---->|
   |                |                    |                 |                |
   |                |                    |<-- partidaId:42 ---------------|
   |                |                    |                 |                |
   |                |                    |-- broadcast(gameStarting) ----->|
   |                |                    |                 |                |
   |<-- gameStarting(partidaId:42) ------|                 |                |
   |                |                    |                 |                |
   |-- Navega para BluetoothConnecting ->|                 |                |
   |                |                    |                 |                |
   |                |-- findDevice("ESP32_01") ---------------------->|
   |                |                    |                 |                |
   |                |<-- conectado ----------------------------------------|
   |                |                    |                 |                |
   |                |-- sendCommand("INICIAR") ------------------------->|
   |                |                    |                 |                |
   |<-- Navega para Quiz ----------------|                 |                |
```

---

## ✅ Checklist de Implementação

### **🎯 Fase 1: Setup e Preparação**

```
Backend:
- [ ] Criar branch: feature/cabin-room-system
- [ ] Setup Redis para estado de cabines (opcional, pode usar memória)
- [ ] Criar modelos/interfaces TypeScript
- [ ] Configurar testes unitários

Frontend:
- [ ] Criar branch: feature/qr-code-cabin-flow
- [ ] Instalar dependências: expo-camera, expo-barcode-scanner
- [ ] Atualizar GameContext com novos campos
- [ ] Criar estrutura de pastas
```

---

### **🔧 Fase 2: Backend WebSocket**

```
- [ ] Criar endpoint /ws/cabin
  - [ ] Autenticação JWT via query param
  - [ ] Handler de conexão (onConnect)
  - [ ] Handler de desconexão (onDisconnect)
  
- [ ] Implementar CabinRoomManager
  - [ ] Map<cabinId, CabinRoom> em memória
  - [ ] Mutex/lock para evitar race conditions
  - [ ] Cleanup de salas vazias (TTL)
  
- [ ] Implementar Actions
  - [ ] joinCabinRoom
    - [ ] Validar cabineId
    - [ ] Determinar role (líder vs participante)
    - [ ] Adicionar player à sala
    - [ ] Broadcast playerJoined
  - [ ] leaveCabinRoom
    - [ ] Remover player da sala
    - [ ] Promover novo líder se necessário
    - [ ] Broadcast playerLeft/promotedToLeader
  - [ ] createTeamForCabin (só líder)
    - [ ] Validar permissão
    - [ ] Criar time no banco
    - [ ] Vincular cabine→time
    - [ ] Adicionar participantes ao time
    - [ ] Broadcast teamCreated
  - [ ] startGameForCabin (só líder)
    - [ ] Validar permissão
    - [ ] Criar partida
    - [ ] Broadcast gameStarting
  - [ ] getCabinStatus
    - [ ] Retornar estado atual da cabine
    
- [ ] Implementar Validações
  - [ ] Rate limiting
  - [ ] Input sanitization
  - [ ] Permission checks
  
- [ ] Adicionar Logs
  - [ ] Structured logging
  - [ ] Cabin lifecycle events
  - [ ] Error tracking
```

---

### **📱 Fase 3: Frontend - Novas Telas**

#### **3.1: QRCodeScannerScreen**

```
- [ ] Criar arquivo: screens/QRCodeScannerScreen.tsx
- [ ] Implementar UI
  - [ ] Camera view (fullscreen)
  - [ ] Overlay com frame de scan
  - [ ] Botão "Voltar"
  - [ ] Botão "Modo Mock" (dev only)
  - [ ] Feedback visual ao escanear (vibração)
  
- [ ] Implementar Lógica
  - [ ] Solicitar permissão de câmera
  - [ ] Detectar QR Code (onBarCodeScanned)
  - [ ] Validar formato JSON
  - [ ] Extrair cabineId e bluetoothName
  - [ ] Salvar no GameContext
  - [ ] Navegar para Login
  
- [ ] Implementar Modo Mock
  - [ ] Gerar dados fake de cabine
  - [ ] Salvar no context
  - [ ] Navegar para Login
  
- [ ] Tratamento de Erros
  - [ ] QR Code inválido
  - [ ] Permissão de câmera negada
  - [ ] Erro de parsing JSON
```

#### **3.2: CabinLobbyScreen**

```
- [ ] Criar arquivo: screens/CabinLobbyScreen.tsx
- [ ] Implementar UI
  - [ ] Loading spinner
  - [ ] Mensagem "Conectando à cabine..."
  - [ ] Animação de pulso
  - [ ] Ícones (👑 para líder, 👥 para participante)
  
- [ ] Implementar Lógica de Conexão
  - [ ] useEffect: conectar ao /ws/cabin ao montar
  - [ ] Enviar joinCabinRoom
  - [ ] Listener para cabinRoomJoined
  
- [ ] Implementar Navegação Condicional
  - [ ] Se role="leader" → TeamsMain
  - [ ] Se role="participant" → Lobby (auto-join)
  - [ ] Se erro → mostrar tela de erro
  
- [ ] Tratamento de Erros
  - [ ] Cabine em jogo
  - [ ] Cabine não encontrada
  - [ ] Timeout de conexão
  - [ ] WebSocket error
```

#### **3.3: BluetoothConnectionErrorScreen**

```
- [ ] Criar arquivo: screens/BluetoothConnectionErrorScreen.tsx
- [ ] Implementar UI
  - [ ] Ícone de erro ⚠️
  - [ ] Mensagem de erro customizada
  - [ ] Botão "Tentar Novamente"
  - [ ] Botão "Modo Mock"
  - [ ] Botão "Voltar ao Lobby"
  
- [ ] Implementar Ações
  - [ ] Tentar Novamente → volta ao QRCodeScanner
  - [ ] Modo Mock → ativa mock no BluetoothService → Quiz
  - [ ] Voltar → navega para Lobby
```

---

### **🔄 Fase 4: Refatorações**

#### **4.1: GameContext**

```typescript
- [ ] Adicionar novos estados
  interface GameContextType {
    // Existentes...
    
    // Novos
    cabinRole: 'leader' | 'participant' | null;
    setCabinRole: (role: 'leader' | 'participant' | null) => void;
    
    bluetoothDeviceName: string | null;
    setBluetoothDeviceName: (name: string | null) => void;
    
    playersInCabin: CabinParticipant[];
    setPlayersInCabin: (players: CabinParticipant[]) => void;
    
    cabinStatus: 'empty' | 'waiting' | 'active' | 'playing' | 'finished';
    setCabinStatus: (status: string) => void;
    
    isMockMode: boolean;
    setIsMockMode: (enabled: boolean) => void;
  }

- [ ] Atualizar resetGame() para limpar novos campos
```

#### **4.2: LobbyScreen**

```
- [ ] REMOVER:
  - [ ] Input manual de cabineId
  - [ ] Estado local cabineIdInput
  
- [ ] ADICIONAR:
  - [ ] Mostrar cabineId do QR Code (readonly)
  - [ ] Mostrar bluetoothDeviceName (readonly)
  - [ ] Indicador de modo mock (se ativo)
  - [ ] Desabilitar "Iniciar Desafio" se não for líder
  
- [ ] MODIFICAR:
  - [ ] handleStartGame: usar cabineId do context
  - [ ] UI: mostrar role (líder ou participante)
  - [ ] Listeners de WebSocket para broadcasts
```

#### **4.3: BluetoothService**

```
- [ ] Adicionar método findDeviceByName
  async findDeviceByName(name: string, timeoutMs: number): Promise<Device>
  
- [ ] Melhorar Mock Mode
  - [ ] Adicionar cenários (success, fail, timeout)
  - [ ] setMockScenario(scenario: string)
  - [ ] Simular delays realistas
  
- [ ] Refatorar connectToDevice
  - [ ] Aceitar nome específico do dispositivo
  - [ ] Timeout configurável
  - [ ] Melhor tratamento de erros
```

#### **4.4: App.tsx (Navegação)**

```
- [ ] Adicionar novas rotas
  - [ ] QRCodeScanner
  - [ ] CabinLobby
  - [ ] BluetoothConnectionError
  
- [ ] Atualizar RootStackParamList
  export type RootStackParamList = {
    // Existentes...
    QRCodeScanner: undefined;
    CabinLobby: undefined;
    BluetoothConnectionError: { error: string };
  };
  
- [ ] Ajustar fluxo de navegação
  - [ ] Após Login → CabinLobby (não mais TeamsMain direto)
  - [ ] CabinLobby → TeamsMain (líder) ou Lobby (participante)
```

---

### **🧪 Fase 5: Testes**

#### **5.1: Testes Unitários (Backend)**

```
- [ ] CabinRoomManager
  - [ ] Criar sala vazia
  - [ ] Adicionar líder
  - [ ] Adicionar participante
  - [ ] Remover player
  - [ ] Promover novo líder
  - [ ] Cleanup de sala vazia
  
- [ ] WebSocket Handlers
  - [ ] joinCabinRoom (líder)
  - [ ] joinCabinRoom (participante)
  - [ ] createTeamForCabin
  - [ ] startGameForCabin
  - [ ] Validações de permissão
```

#### **5.2: Testes de Integração**

```
- [ ] Fluxo completo líder
  1. Conectar WebSocket
  2. joinCabinRoom → recebe role:leader
  3. createTeamForCabin → time criado
  4. startGameForCabin → partida iniciada
  
- [ ] Fluxo completo participante
  1. Conectar WebSocket (depois do líder)
  2. joinCabinRoom → recebe role:participant
  3. Recebe broadcast teamCreated
  4. Recebe broadcast gameStarting
  
- [ ] Fluxo de promoção
  1. Líder desconecta
  2. Participante recebe promotedToLeader
  3. Novo líder pode criar time
```

#### **5.3: Testes E2E (Frontend + Backend)**

```
- [ ] Teste com 2 dispositivos reais
  - [ ] Device A escaneia QR → vira líder
  - [ ] Device B escaneia mesmo QR → vira participante
  - [ ] Device A cria time
  - [ ] Device B vê time criado
  - [ ] Device A inicia jogo
  - [ ] Ambos navegam para Quiz
  
- [ ] Teste de concorrência
  - [ ] 2+ devices escaneiam simultaneamente
  - [ ] Apenas 1 vira líder
  - [ ] Demais viram participantes
  
- [ ] Teste de desconexão
  - [ ] Líder desconecta antes de criar time
  - [ ] Participante promovido
  - [ ] Fluxo continua normal
```

#### **5.4: Testes de Mock Mode**

```
- [ ] Modo mock sem backend
- [ ] Gerar cabine fake
- [ ] Simular role aleatório
- [ ] Simular broadcasts
- [ ] Fluxo completo mockado
```

---

### **📚 Fase 6: Documentação**

```
- [ ] Atualizar README.md
- [ ] Documentar novo fluxo de telas
- [ ] Documentar formato QR Code para hardware
- [ ] Criar guia de troubleshooting
- [ ] Adicionar exemplos de código
- [ ] Gravar vídeo demo (opcional)
```

---

### **🚀 Fase 7: Deploy**

```
Backend:
- [ ] Code review
- [ ] Testes em staging
- [ ] Deploy em produção
- [ ] Monitoramento de logs
- [ ] Alertas configurados

Frontend:
- [ ] Code review
- [ ] Build de produção (Android/iOS)
- [ ] Testar em dispositivos reais
- [ ] Submit para Play Store/App Store (se aplicável)

Hardware:
- [ ] Atualizar firmware das cabines
- [ ] Gerar QR Codes no novo formato
- [ ] Testar com app em produção
```

---

## 🗂️ Estrutura de Arquivos

### **Backend**

```
backend/
├── src/
│   ├── websocket/
│   │   ├── cabin/
│   │   │   ├── CabinWebSocketHandler.ts     # Handler principal
│   │   │   ├── CabinRoomManager.ts          # Gerenciamento de salas
│   │   │   ├── CabinRoom.ts                 # Model
│   │   │   ├── actions/
│   │   │   │   ├── joinCabinRoom.ts
│   │   │   │   ├── leaveCabinRoom.ts
│   │   │   │   ├── createTeamForCabin.ts
│   │   │   │   └── startGameForCabin.ts
│   │   │   ├── broadcasts/
│   │   │   │   ├── playerJoined.ts
│   │   │   │   ├── playerLeft.ts
│   │   │   │   ├── teamCreated.ts
│   │   │   │   └── gameStarting.ts
│   │   │   └── validators/
│   │   │       ├── validateCabinId.ts
│   │   │       └── validatePermission.ts
│   │   ├── time/                            # Existente
│   │   └── partida/                         # Existente
│   ├── models/
│   │   └── CabinRoom.model.ts
│   └── tests/
│       └── cabin/
│           ├── CabinRoomManager.test.ts
│           └── integration.test.ts
```

### **Frontend**

```
mobile/
├── screens/
│   ├── QRCodeScannerScreen.tsx              # ✨ NOVO
│   ├── CabinLobbyScreen.tsx                 # ✨ NOVO
│   ├── BluetoothConnectionErrorScreen.tsx   # ✨ NOVO
│   ├── LobbyScreen.tsx                      # 🔄 MODIFICADO
│   ├── BluetoothConnectionScreen.tsx        # 🔄 MODIFICADO
│   └── ...
├── context/
│   └── GameContext.tsx                      # 🔄 MODIFICADO
├── services/
│   ├── BluetoothService.ts                  # 🔄 MODIFICADO
│   ├── WebSocketService.ts                  # Usar existente
│   └── QRCodeValidator.ts                   # ✨ NOVO
├── types/
│   ├── cabin.ts                             # ✨ NOVO
│   └── ...
├── utils/
│   └── qrcode.ts                            # ✨ NOVO
├── App.tsx                                  # 🔄 MODIFICADO
├── CABIN_ROOM_FLOW.md                       # ✅ JÁ CRIADO
├── WEBSOCKET_CABIN_API.md                   # ✅ JÁ CRIADO
├── QR_CODE_SPECIFICATION.md                 # ✅ JÁ CRIADO
└── IMPLEMENTATION_GUIDE.md                  # ✅ JÁ CRIADO
```

---

## 🏗️ Ordem de Desenvolvimento

### **Recomendação de Ordem (Minimizar Bloqueios)**

```
Semana 1: Backend Foundation
├── Dia 1-2: Setup e modelos
│   - Criar estrutura de pastas
│   - Definir interfaces TypeScript
│   - Setup Redis (opcional)
│   - Testes unitários básicos
│
├── Dia 3-4: WebSocket Endpoint
│   - Implementar /ws/cabin
│   - Handlers de conexão/desconexão
│   - joinCabinRoom (líder/participante)
│   - Testes de integração
│
└── Dia 5: Actions e Broadcasts
    - createTeamForCabin
    - startGameForCabin
    - Broadcasts (playerJoined, etc)
    - Deploy em staging

Semana 2: Frontend Development
├── Dia 1-2: Context e Serviços
│   - Atualizar GameContext
│   - Melhorar BluetoothService (findDeviceByName)
│   - Criar QRCodeValidator
│   - Criar tipos TypeScript
│
├── Dia 3: QR Scanner
│   - QRCodeScannerScreen
│   - Integração com câmera
│   - Modo mock
│   - Navegação
│
├── Dia 4: Cabin Lobby
│   - CabinLobbyScreen
│   - Integração WebSocket
│   - Lógica de navegação condicional
│   - Telas de erro
│
└── Dia 5: Refatorações
    - Refatorar LobbyScreen
    - Atualizar App.tsx (navegação)
    - Ajustes de UI/UX
    - Testes manuais

Semana 3: Integração e Testes
├── Dia 1-2: Testes E2E
│   - Testes com 2 dispositivos
│   - Testes de concorrência
│   - Testes de desconexão
│
├── Dia 3-4: Refinamentos
│   - Correção de bugs
│   - Melhorias de UX
│   - Otimizações de performance
│
└── Dia 5: Deploy
    - Build de produção
    - Deploy backend
    - Testes em produção (canary)
    - Rollout completo
```

---

## 🧪 Estratégia de Testes

### **Pirâmide de Testes**

```
           /\
          /  \  E2E (10%)
         /____\
        /      \  Integration (30%)
       /________\
      /          \  Unit (60%)
     /____________\
```

### **Casos de Teste Críticos**

**P0 (Bloqueadores):**
1. ✅ Primeiro jogador vira líder
2. ✅ Segundo jogador vira participante
3. ✅ Líder cria time com sucesso
4. ✅ Participantes recebem teamCreated
5. ✅ Líder inicia jogo, todos navegam

**P1 (Alta Prioridade):**
6. ✅ Líder sai → participante promovido
7. ✅ Cabine em jogo → erro ao entrar
8. ✅ Reconexão mantém estado
9. ✅ QR Code inválido → erro tratado
10. ✅ Modo mock funciona

**P2 (Média Prioridade):**
11. ✅ 5 jogadores simultâneos
12. ✅ Participante tenta criar time → erro
13. ✅ Rate limiting funciona
14. ✅ WebSocket desconecta → reconecta

---

## 🐛 Troubleshooting

### **Problemas Comuns**

#### **1. Backend: Race Condition no líder**

**Sintoma:** Dois jogadores viram líderes

**Causa:** Falta de lock/mutex

**Solução:**
```typescript
// Usar lock/mutex ao determinar líder
const lock = await acquireLock(`cabin:${cabinId}`);
try {
  const cabin = getCabinRoom(cabinId);
  if (!cabin.leaderId) {
    cabin.leaderId = userId;
  }
} finally {
  await releaseLock(`cabin:${cabinId}`);
}
```

#### **2. Frontend: QR Code não escaneia**

**Sintoma:** Câmera não detecta QR Code

**Possíveis Causas:**
- Permissão de câmera não concedida
- QR Code muito pequeno/longe
- Iluminação ruim
- Formato JSON inválido

**Debug:**
```typescript
// Adicionar logs
onBarCodeScanned={({ data }) => {
  console.log('[QR] Raw data:', data);
  console.log('[QR] Data length:', data.length);
  console.log('[QR] First char:', data[0]);
}}
```

#### **3. WebSocket: Desconexão frequente**

**Sintoma:** WebSocket desconecta a cada 30s

**Possíveis Causas:**
- Proxy/firewall timeout
- Falta de heartbeat

**Solução:**
```typescript
// Implementar ping/pong
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: 'ping' }));
  }
}, 25000); // 25s
```

---

## 📊 Métricas de Sucesso

### **KPIs**

1. **Taxa de Sucesso de QR Scan:** > 95%
2. **Tempo Médio até Lobby:** < 15 segundos
3. **Taxa de Conexão WebSocket:** > 98%
4. **Taxa de Promoção de Líder:** < 5% (líder geralmente fica)
5. **Taxa de Erro de Cabine Ocupada:** < 10%

### **Monitoramento**

```typescript
// Backend logs a trackear
- cabin_room_created
- player_joined_as_leader
- player_joined_as_participant
- team_created
- game_started
- leader_promoted
- cabin_error (com tipo de erro)

// Frontend analytics
- qr_code_scanned
- qr_code_invalid
- cabin_lobby_role_assigned
- bluetooth_connection_success
- bluetooth_connection_failed
```

---

## ✅ Definition of Done

Uma feature está completa quando:

- [ ] ✅ Código implementado e funcional
- [ ] ✅ Testes unitários passando (>80% coverage)
- [ ] ✅ Testes de integração passando
- [ ] ✅ Testado em 2+ dispositivos reais
- [ ] ✅ Code review aprovado
- [ ] ✅ Documentação atualizada
- [ ] ✅ Logs e monitoramento implementados
- [ ] ✅ Deploy em staging bem-sucedido
- [ ] ✅ QA sign-off
- [ ] ✅ Deploy em produção
- [ ] ✅ Smoke tests em produção passando

---

## 🎯 Próximos Passos

1. **Revisão desta documentação** ✅ (você está aqui)
2. **Aprovação do plano** (aguardando)
3. **Criar branch e começar implementação**
4. **Daily syncs para acompanhar progresso**
5. **Demo ao final de cada fase**

---

**Guia criado em:** 2026-01-04  
**Versão:** 1.0  
**Status:** 📋 Pronto para Aprovação e Implementação

---

## 💡 Dicas Finais

1. **Comece pelo backend** - Frontend depende dele
2. **Use modo mock** - Desenvolva sem bloquear
3. **Teste cedo e frequentemente** - Evita bugs tardios
4. **Monitore logs** - Detecte problemas rapidamente
5. **Documente à medida que desenvolve** - Não deixe para depois

**Boa sorte com a implementação! 🚀**

