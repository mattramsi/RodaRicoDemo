# 📱 Documentação Completa das Telas - RodaRico

## Índice
1. [QR Code Scanner](#1-qr-code-scanner)
2. [Login/Nickname](#2-loginnickname)
3. [Cabin Lobby (Verificando Sala)](#3-cabin-lobby-verificando-sala)
4. [Lobby do Time](#4-lobby-do-time)
5. [Quiz (Jogo)](#5-quiz-jogo)
6. [Resultado](#6-resultado)
7. [Fluxos de Bluetooth](#fluxos-de-bluetooth)
8. [Arquitetura de APIs](#arquitetura-de-apis)

---

## 1. QR Code Scanner

### 📋 Descrição
Primeira tela após permissões de Bluetooth. Permite ao jogador escanear o QR Code da cabine física para iniciar o jogo.

### 🎯 Objetivo
- Capturar informações da cabine (ID, nome Bluetooth do ESP32)
- Iniciar contexto do jogo com dados da cabine

### 🖼️ Componentes UI
- Camera View (scanner QR)
- Indicador de foco (retângulo azul)
- Texto instrucional: "Aponte para o QR Code da cabine"
- Botão "Mock" (modo debug)

### 📊 Fluxograma
```
┌─────────────────────┐
│ App Inicializa      │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Verifica Permissões │
│ Bluetooth/Câmera    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ QR Code Scanner     │
│ [Câmera Ativa]      │
└──────────┬──────────┘
           │
           ├─────────────┐
           │             │
           v             v
    [QR Detectado]  [Botão Mock]
           │             │
           v             v
    ┌───────────┐  ┌──────────┐
    │ Valida QR │  │Mock Mode │
    └─────┬─────┘  └────┬─────┘
          │             │
          v             v
    ┌─────────────────────┐
    │   Login Screen      │
    └─────────────────────┘
```

### 🔌 APIs/Serviços Envolvidos

#### Serviços
- **Camera (expo-camera)**
  - Permissões de câmera
  - Detecção de QR Code
  
#### Contexto/Estado
- **GameContext**
  - `setCabinId(id)` - Armazena ID da cabine
  - `setBluetoothDeviceName(name)` - Armazena nome do dispositivo ESP32
  - `setIsMockMode(boolean)` - Define modo mock

#### Estrutura do QR Code
```json
{
  "type": "rodarico_cabin",
  "v": "1.0",
  "cabinId": 999,
  "bluetoothName": "ESP32_MOCK_999",
  "hardware": {
    "version": "mock",
    "firmware": "0.0.1-mock"
  },
  "timestamp": "2026-01-04T20:40:11.569Z"
}
```

### 🔄 Bluetooth Flow
**Nesta tela:** Nenhuma conexão Bluetooth ainda.
- Apenas captura o `bluetoothName` para conexão futura

### ➡️ Navegação
- **Sucesso QR:** → `Login Screen`
- **Mock Mode:** → `Login Screen` (com modo mock ativo)
- **Erro:** Permanece na tela com mensagem

---

## 2. Login/Nickname

### 📋 Descrição
Tela de entrada onde o jogador digita seu nickname para identificação no jogo.

### 🎯 Objetivo
- Capturar nickname do jogador
- Fazer autenticação/registro no backend
- Estabelecer sessão do jogador

### 🖼️ Componentes UI
- Logo "RodaRico"
- Subtitle: "Jogo de Desarme de Bomba"
- Badge: "MODO MOCK ATIVO" (se em modo mock)
- Input: "Digite seu nickname"
- Botão: "Entrar" (azul)

### 📊 Fluxograma
```
┌─────────────────────┐
│   QR Code Scanned   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│   Login Screen      │
│ [Input Nickname]    │
└──────────┬──────────┘
           │
           v
    [Clica "Entrar"]
           │
           v
┌─────────────────────┐
│  Valida Nickname    │
│  (min 3 chars)      │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     v           v
  [Válido]   [Inválido]
     │           │
     │           v
     │      [Mostra Erro]
     │           │
     │           └──────┐
     v                  │
┌─────────────────┐     │
│ POST /auth      │     │
│ {nickname,      │     │
│  cabinId}       │     │
└────────┬────────┘     │
         │              │
    ┌────┴────┐         │
    │         │         │
    v         v         │
[200 OK] [Erro 4xx]    │
    │         │         │
    │         └─────────┘
    v
┌─────────────────────┐
│  Cabin Lobby Screen │
└─────────────────────┘
```

### 🔌 APIs/Serviços Envolvidos

#### API Backend
**Endpoint:** `POST /api/auth`

**Request:**
```json
{
  "nickname": "Jogador1",
  "cabinId": 999
}
```

**Response (Modo Real):**
```json
{
  "success": true,
  "userId": "uuid-123",
  "nickname": "Jogador1",
  "token": "jwt-token"
}
```

**Response (Modo Mock):**
```json
{
  "success": true,
  "userId": "mock-user-id",
  "nickname": "Jogador1",
  "mockMode": true
}
```

#### Serviços
- **AuthService**
  - `login(nickname, cabinId)` - Faz autenticação
  
#### Contexto/Estado
- **GameContext**
  - `setUserId(id)` - Armazena ID do usuário
  - `setNickname(name)` - Armazena nickname
  - `setAuthToken(token)` - Armazena token JWT

### 🔄 Bluetooth Flow
**Nesta tela:** Nenhuma conexão Bluetooth ainda.

### ➡️ Navegação
- **Login Sucesso:** → `Cabin Lobby Screen`
- **Erro de Rede:** Mostra toast/alerta, permanece na tela

---

## 3. Cabin Lobby (Verificando Sala)

### 📋 Descrição
Tela intermediária que verifica a disponibilidade da sala/cabine e determina a função do jogador (Líder ou Participante).

### 🎯 Objetivo
- Verificar disponibilidade da cabine
- Determinar role do jogador (Leader/Participant)
- Criar time (se líder) ou aguardar líder criar time

### 🖼️ Componentes UI
- Emoji casa 🏠
- Título: "Verificando Sala..."
- Texto: "Cabine #999"
- Subtexto: "ESP32_MOCK_999"
- Badge: "MODO MOCK" (se ativo)
- Loading spinner
- Status: "Determinando sua função..."

### 📊 Fluxograma
```
┌─────────────────────┐
│   Login Success     │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Cabin Lobby        │
│  [Loading]          │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ GET /cabin/status   │
│ {cabinId}           │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     v           v
 [Livre]    [Ocupada]
     │           │
     v           v
[É Líder]  [É Participante]
     │           │
     │           v
     │    ┌──────────────┐
     │    │ GET /team    │
     │    │ info         │
     │    └──────┬───────┘
     │           │
     └─────┬─────┘
           │
           v
┌─────────────────────┐
│   Lobby Screen      │
│  (Aguardando Time)  │
└─────────────────────┘
```

### 🔌 APIs/Serviços Envolvidos

#### API Backend
**Endpoint 1:** `GET /api/cabin/{cabinId}/status`

**Response:**
```json
{
  "cabinId": 999,
  "status": "available",
  "currentTeam": null,
  "role": "leader"
}
```

**Endpoint 2:** `GET /api/team/{cabinId}`

**Response (se já existe time):**
```json
{
  "teamId": "team-uuid",
  "teamName": "Time Mock",
  "leader": {
    "userId": "user-1",
    "nickname": "Líder Mock"
  },
  "members": [
    {
      "userId": "user-2",
      "nickname": "Você"
    }
  ]
}
```

#### Serviços Mock
**Modo Mock:**
- Retorna role aleatório (50% líder, 50% participante)
- Simula delay de 2 segundos
- Não faz chamadas reais ao backend

#### Contexto/Estado
- **GameContext**
  - `setRole(role)` - Define role: 'leader' | 'participant'
  - `setTeamId(id)` - Define ID do time

### 🔄 Bluetooth Flow
**Modo Real:**
- Se for líder E modo real: → Vai para `Bluetooth Connection Screen`
- Se for participante: → Vai direto para `Lobby Screen`

**Modo Mock:**
- Pula conexão Bluetooth
- Vai direto para `Lobby Screen`

### ➡️ Navegação
- **Modo Real + Líder:** → `Bluetooth Connection Screen`
- **Modo Real + Participante:** → `Lobby Screen`
- **Modo Mock (qualquer role):** → `Lobby Screen`
- **Erro:** → Volta para `QR Code Scanner`

---

## 4. Lobby do Time

### 📋 Descrição
Sala de espera onde jogadores aguardam o líder iniciar o jogo. Mostra informações da cabine, lista de jogadores e status de conexão.

### 🎯 Objetivo
- Mostrar lista de jogadores conectados
- Permitir líder iniciar o jogo
- Exibir status da cabine e Bluetooth
- Aguardar todos estarem prontos

### 🖼️ Componentes UI
- Título: "Lobby do Time"
- Badge: "Time Mock" (nome do time)
- Card "Informações da Cabine":
  - ID da cabine
  - Nome Bluetooth
  - Função (Líder/Participante)
  - Badge "MODO MOCK ATIVO"
- Seção "Jogadores (2)":
  - Lista de jogadores com emoji
  - Indicador de líder 👑
- Mensagem: "Aguardando o líder iniciar o desafio..."
- Botão: "[Mock Debug] Forçar Início do Jogo" (apenas em mock)

### 📊 Fluxograma
```
┌──────────────────────┐
│  Cabin Lobby Done    │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│   Lobby Screen       │
│  [Lista Jogadores]   │
└──────────┬───────────┘
           │
           v
    [WebSocket Connect]
           │
     ┌─────┴─────┐
     │           │
     v           v
[É Líder]  [É Participante]
     │           │
     │           v
     │    ┌──────────────┐
     │    │  Aguarda     │
     │    │  Líder       │
     │    └──────┬───────┘
     │           │
     v           │
┌─────────────┐  │
│Botão Iniciar│  │
│  Visível    │  │
└──────┬──────┘  │
       │         │
       v         │
[Clica Iniciar]  │
       │         │
       v         │
┌──────────────┐ │
│POST /match   │ │
│/start        │ │
└──────┬───────┘ │
       │         │
       v         │
[WS: game_start] │
       │         │
       └────┬────┘
            │
            v
    ┌───────────────┐
    │ Carrega       │
    │ Perguntas     │
    └───────┬───────┘
            │
            v
    ┌───────────────┐
    │ Quiz Screen   │
    └───────────────┘
```

### 🔌 APIs/Serviços Envolvidos

#### WebSocket Events (Modo Real)

**Subscribe:**
- `team:member_joined` - Novo membro entrou no time
- `team:member_left` - Membro saiu do time
- `match:start` - Líder iniciou o jogo
- `match:questions` - Recebe perguntas do servidor

**Emit:**
- `team:join` - Entrar no time
- `match:start` - Iniciar jogo (apenas líder)

**Exemplos:**

```javascript
// Membro entrou
{
  "event": "team:member_joined",
  "data": {
    "userId": "user-3",
    "nickname": "Jogador3",
    "timestamp": "2026-01-04T20:40:15.000Z"
  }
}

// Líder inicia jogo
{
  "event": "match:start",
  "data": {
    "matchId": "match-uuid",
    "startedBy": "user-1",
    "timestamp": "2026-01-04T20:40:20.000Z"
  }
}
```

#### API Backend

**Endpoint:** `POST /api/match/start`

**Request:**
```json
{
  "teamId": "team-uuid",
  "cabinId": 999,
  "leaderId": "user-1"
}
```

**Response:**
```json
{
  "matchId": "match-uuid",
  "questions": [
    {
      "id": 1,
      "text": "Quantos segundos restam no temporizador quando o LED verde acende?",
      "points": 150,
      "difficulty": "medium"
    }
  ],
  "duration": 600
}
```

#### Serviços
- **WebSocketService**
  - `connect()` - Conecta ao servidor WebSocket
  - `joinTeam(teamId)` - Entra no time
  - `startMatch(teamId)` - Inicia partida (líder)
  - `on(event, callback)` - Escuta eventos
  
- **QuestionService**
  - `loadQuestions(matchId)` - Carrega perguntas

#### Modo Mock
- Lista de jogadores mockada (2 jogadores fixos)
- Botão "Forçar Início" disponível para qualquer role
- Não conecta WebSocket
- Gera perguntas localmente

#### Contexto/Estado
- **GameContext**
  - `setMatchId(id)` - ID da partida
  - `setQuestions(questions)` - Perguntas carregadas
  - `setTeamMembers(members)` - Lista de membros

### 🔄 Bluetooth Flow

**Modo Real (Líder):**
```
[Líder Clica Iniciar]
        │
        v
┌───────────────┐
│ BT: INICIAR   │ → Comando para ESP32
└───────┬───────┘
        │
        v
[ESP32 Inicia Timer]
        │
        v
[ESP32 → Notificação]
"TEMPO_ATUALIZADO"
{segundosRestantes: 600}
```

**Modo Mock:**
- Simula comando Bluetooth
- Simula notificações de timer localmente

### ➡️ Navegação
- **Líder Inicia Jogo:** → `Quiz Screen`
- **Participante (quando líder inicia):** → `Quiz Screen`
- **Erro na Conexão:** Mostra toast de erro

---

## 5. Quiz (Jogo)

### 📋 Descrição
Tela principal do jogo onde perguntas são exibidas e o jogador responde. Timer decrescente mostra tempo restante.

### 🎯 Objetivo
- Exibir perguntas do desafio
- Capturar respostas dos jogadores
- Mostrar feedback (correto/incorreto)
- Sincronizar com timer do ESP32
- Monitorar status da bomba

### 🖼️ Componentes UI
- Timer: "09:44" (vermelho, destaque)
- Contador de perguntas: "5 / 5"
- Info bar:
  - "Time: Time Mock"
  - "Partida ID: 4263"
- Card da pergunta:
  - Texto da pergunta
  - "Pontos: 150"
- Input: "Digite sua resposta"
- Botão: "Responder" (azul)

### 📊 Fluxograma
```
┌──────────────────────┐
│   Lobby → Start      │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│   Quiz Screen        │
│  [Pergunta 1/5]      │
└──────────┬───────────┘
           │
           v
    [Setup Listeners]
    - TEMPO_ATUALIZADO
    - BOMBA_EXPLODIDA
    - BOMBA_RESFRIADA
           │
           v
┌──────────────────────┐
│  Loop de Perguntas   │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
     v           v
[Jogador    [Timer ESP32]
 Responde]      │
     │          v
     │    [BT Notification:
     │     TEMPO_ATUALIZADO]
     │          │
     v          v
┌─────────────────────┐
│ POST /answer        │
│ {perguntaId,        │
│  resposta}          │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     v           v
[Correta]   [Incorreta]
     │           │
     │           v
     │     [Feedback]
     │           │
     └─────┬─────┘
           │
           v
  [Próxima Pergunta]
           │
     ┌─────┴─────┐
     │           │
     v           v
[Tem Mais]  [Acabou]
     │           │
     │           v
     │    ┌──────────────┐
     │    │  Calcula     │
     │    │  Resultado   │
     │    └──────┬───────┘
     │           │
     │           v
     │      [1+ Correta?]
     │           │
     │      ┌────┴────┐
     │      │         │
     │      v         v
     │  [Sucesso] [Falha]
     │      │         │
     └──────┴─────────┘
            │
            v
    ┌───────────────┐
    │Result Screen  │
    └───────────────┘
```

### 🔌 APIs/Serviços Envolvidos

#### API Backend

**Endpoint:** `POST /api/match/{matchId}/answer`

**Request:**
```json
{
  "matchId": "match-uuid",
  "userId": "user-1",
  "questionId": 1,
  "answer": "150",
  "timestamp": "2026-01-04T20:41:00.000Z"
}
```

**Response:**
```json
{
  "correct": true,
  "points": 150,
  "correctAnswer": "150",
  "explanation": "Resposta correta!"
}
```

#### WebSocket Events

**Subscribe:**
- `match:answer` - Resposta de outros jogadores
- `match:time_update` - Atualização de tempo do servidor

**Emit:**
- `match:answer` - Enviar resposta

#### Serviços
- **QuestionService**
  - `submitAnswer(questionId, answer)` - Envia resposta
  - `validateAnswer(questionId, answer)` - Valida resposta (mock)

- **WebSocketService**
  - `emit('match:answer', data)` - Envia resposta via WS

#### Modo Mock
- Valida respostas localmente
- Simula feedback aleatório (80% correto)
- Não envia respostas ao servidor

#### Contexto/Estado
- **GameContext**
  - `currentQuestionIndex` - Índice da pergunta atual
  - `answers` - Array de respostas
  - `score` - Pontuação acumulada
  - `secondsRemaining` - Segundos restantes

### 🔄 Bluetooth Flow

**Notificações Bluetooth (ESP32 → App):**

```javascript
// Timer Update (a cada 5 segundos)
{
  "type": "TEMPO_ATUALIZADO",
  "data": {
    "segundosRestantes": 595
  },
  "timestamp": 1767559321143
}

// Bomba Explodiu (tempo esgotou)
{
  "type": "BOMBA_EXPLODIDA",
  "data": {
    "message": "Tempo esgotado!"
  },
  "timestamp": 1767559921143
}

// Bomba Resfriada (pausa)
{
  "type": "BOMBA_RESFRIADA",
  "data": {
    "segundosRestantes": 300
  },
  "timestamp": 1767559621143
}
```

**Listeners Ativos:**
```javascript
// Quiz Screen useEffect
useEffect(() => {
  const timeListener = bluetoothService.addListener(
    'TEMPO_ATUALIZADO',
    (notification) => {
      setSecondsRemaining(notification.data.segundosRestantes);
    }
  );
  
  const bombExplodedListener = bluetoothService.addListener(
    'BOMBA_EXPLODIDA',
    () => {
      // Força resultado de falha
      navigation.navigate('Result', { result: 'fail' });
    }
  );
  
  return () => {
    bluetoothService.removeListener('TEMPO_ATUALIZADO', timeListener);
    bluetoothService.removeListener('BOMBA_EXPLODIDA', bombExplodedListener);
  };
}, []);
```

### ➡️ Navegação
- **Todas perguntas respondidas:** → `Result Screen`
- **Tempo esgotou (BT: BOMBA_EXPLODIDA):** → `Result Screen` (fail)
- **Erro crítico:** Mostra alerta e permite voltar

---

## 6. Resultado

### 📋 Descrição
Tela de resultado final mostrando se o time conseguiu desarmar a bomba (sucesso) ou falhou. Exibe pontuação e opções para próximas ações.

### 🎯 Objetivo
- Mostrar resultado (sucesso/falha)
- Exibir pontuação total
- Permitir desarmar bomba (se sucesso)
- Oferecer opções: jogar novamente, voltar ao início

### 🖼️ Componentes UI
- Título: "Resultado"
- Card de Status:
  - Verde com ✓: "Sucesso!" (se passou)
  - Vermelho com ✗: "Falha!" (se não passou)
- Texto: "Pontuação Acumulada"
- Score grande: "1100"
- Botões:
  - "Desarmar Bomba" (azul, primário)
  - "Jogar Novamente" (cinza)
  - "Voltar ao Início" (cinza)

### 📊 Fluxograma
```
┌──────────────────────┐
│   Quiz Finalizado    │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│  Calcula Resultado   │
│  - Corretas: 5       │
│  - Erradas: 0        │
│  - Score: 1100       │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
     v           v
[1+ Correta] [0 Corretas]
     │           │
     v           v
[result:    [result:
 success]    fail]
     │           │
     └─────┬─────┘
           │
           v
┌──────────────────────┐
│  Result Screen       │
│  [Mostra Score]      │
└──────────┬───────────┘
           │
     ┌─────┴─────────────┐
     │                   │
     v                   v
[Sucesso]          [Falha]
     │                   │
     v                   v
[Botão Desarmar]   [Sem Desarmar]
[Disponível]       [Apenas Replay]
     │                   │
     └─────┬─────────────┘
           │
     [Ações Usuário]
           │
     ┌─────┼─────┬───────┐
     │     │     │       │
     v     v     v       v
[Desarmar][Jogar][Voltar]
 Bomba    Again  Início
     │     │     │
     │     │     └──────────┐
     │     │                │
     │     v                │
     │  [Reset Game]        │
     │     │                │
     v     │                │
[BT: DESARMAR]             │
     │     │                │
     v     │                │
[Aguarda BT:               │
 BOMBA_DESARMADA]          │
     │     │                │
     v     v                v
┌──────────────────────────┐
│  Navigation Reset        │
│  → QR Code Scanner       │
└──────────────────────────┘
```

### 🔌 APIs/Serviços Envolvidos

#### API Backend

**Endpoint:** `POST /api/match/{matchId}/finish`

**Request:**
```json
{
  "matchId": "match-uuid",
  "result": "success",
  "score": 1100,
  "answers": [
    {
      "questionId": 1,
      "answer": "150",
      "correct": true,
      "points": 150
    }
  ],
  "duration": 585,
  "timestamp": "2026-01-04T20:45:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "finalScore": 1100,
  "ranking": {
    "position": 5,
    "total": 100
  },
  "achievements": ["first_win", "speed_demon"]
}
```

#### WebSocket Events

**Emit:**
- `match:finish` - Finalizar partida

**Subscribe:**
- `match:finished` - Partida finalizada (broadcast para time)

#### Serviços
- **BluetoothService** (apenas se sucesso)
  - `sendCommand('DESARMAR')` - Envia comando de desarmar

- **WebSocketService**
  - `reset()` - Reseta conexão WebSocket

#### Contexto/Estado
- **GameContext**
  - `resetGameFully()` - Reseta todo o estado do jogo
  - `getScore()` - Obtém pontuação final
  - `getResult()` - Obtém resultado (success/fail)

### 🔄 Bluetooth Flow

**Desarmar Bomba (apenas em caso de sucesso):**

```
[Usuário Clica "Desarmar Bomba"]
        │
        v
┌───────────────┐
│ Setup Listener│
│ BOMBA_DESARMADA│
└───────┬───────┘
        │
        v
┌───────────────┐
│ BT: DESARMAR  │ → Comando para ESP32
└───────┬───────┘
        │
        v
[ESP32 Para Timer]
[ESP32 Desliga Bomba]
        │
        v
[ESP32 → Notificação]
"BOMBA_DESARMADA"
{tempoFinal: 585}
        │
        v
┌───────────────┐
│ Remove        │
│ Listener      │
└───────┬───────┘
        │
        v
[Feedback UI: ✓]
"Bomba desarmada!"
```

**Notificação Esperada:**
```javascript
{
  "type": "BOMBA_DESARMADA",
  "data": {
    "tempoFinal": 585,
    "message": "Bomba desarmada com sucesso!"
  },
  "timestamp": 1767559265696
}
```

**Código Exemplo:**
```javascript
const handleDisarmBomb = async () => {
  try {
    // Adiciona listener para confirmação
    const listener = bluetoothService.addListener(
      'BOMBA_DESARMADA',
      (notification) => {
        console.log('✅ Bomba desarmada!', notification.data.tempoFinal);
        // Remove listener após receber
        bluetoothService.removeListener('BOMBA_DESARMADA', listener);
      }
    );
    
    // Envia comando
    await bluetoothService.sendCommand('DESARMAR');
    
    // Timeout de 5 segundos
    setTimeout(() => {
      bluetoothService.removeListener('BOMBA_DESARMADA', listener);
    }, 5000);
    
  } catch (error) {
    console.error('Erro ao desarmar:', error);
  }
};
```

### ➡️ Navegação
- **"Desarmar Bomba":** 
  - Envia comando BT
  - Aguarda confirmação
  - Mostra feedback
  - Permanece na tela

- **"Jogar Novamente":**
  - `game.resetGameFully()`
  - `wsService.reset()` (se modo real)
  - `navigation.reset()` → `QR Code Scanner`

- **"Voltar ao Início":**
  - `game.resetGameFully()`
  - `wsService.reset()` (se modo real)
  - `navigation.reset()` → `QR Code Scanner`

---

## Fluxos de Bluetooth

### 📡 Conexão Bluetooth (ESP32)

#### Modo Real - Fluxo de Conexão

```
┌─────────────────────┐
│ Cabin Lobby         │
│ (Role: Leader)      │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Bluetooth Connection│
│ Screen              │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ bluetoothService    │
│ .scanForDevice()    │
└──────────┬──────────┘
           │
           v
    [Procura por]
    bluetoothName
    (ex: ESP32_MOCK_999)
           │
     ┌─────┴─────┐
     │           │
     v           v
[Encontrado] [Não Encontrado]
     │           │
     │           v
     │     [Timeout 30s]
     │           │
     │           v
     │     [Mostra Erro]
     │           │
     v           │
┌─────────────┐  │
│ .connect()  │  │
└──────┬──────┘  │
       │         │
  ┌────┴────┐    │
  │         │    │
  v         v    │
[OK]    [Erro]  │
  │         │    │
  │         └────┤
  v              │
[Discover        │
 Services]       │
  │              │
  v              │
[Subscreve       │
 Notificações]   │
  │              │
  v              │
[Conexão OK]     │
  │              │
  v              v
┌─────────────────┐
│ Lobby Screen    │
│ (BT Conectado)  │
└─────────────────┘
```

#### Serviços e Características UUID

**Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

**Características:**

1. **Command (Write)**
   - UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
   - Propriedades: WRITE
   - Comandos:
     - `INICIAR` - Inicia o jogo
     - `DESARMAR` - Desarma a bomba
     - `PAUSAR` - Pausa o timer
     - `RESFRIAR` - Resfria a bomba

2. **Notification (Read/Notify)**
   - UUID: `cba1d466-344c-4be3-ab3f-189f80dd7518`
   - Propriedades: READ, NOTIFY
   - Notificações:
     - `TEMPO_ATUALIZADO` - Timer update
     - `BOMBA_EXPLODIDA` - Bomba explodiu
     - `BOMBA_DESARMADA` - Bomba desarmada
     - `BOMBA_RESFRIADA` - Bomba resfriada

### 📤 Comandos Bluetooth (App → ESP32)

```javascript
// BluetoothService.ts

async sendCommand(command: 'INICIAR' | 'DESARMAR' | 'PAUSAR' | 'RESFRIAR') {
  try {
    const commandBuffer = Buffer.from(command, 'utf-8');
    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      COMMAND_CHAR_UUID,
      commandBuffer.toString('base64')
    );
    console.log(`[BT] Comando enviado: ${command}`);
  } catch (error) {
    console.error('[BT] Erro ao enviar comando:', error);
    throw error;
  }
}
```

**Exemplo de Uso:**
```javascript
// No Lobby Screen, quando líder inicia
await bluetoothService.sendCommand('INICIAR');

// No Result Screen, quando desarma
await bluetoothService.sendCommand('DESARMAR');
```

### 📥 Notificações Bluetooth (ESP32 → App)

```javascript
// BluetoothService.ts

setupNotifications() {
  this.device.monitorCharacteristicForService(
    SERVICE_UUID,
    NOTIFICATION_CHAR_UUID,
    (error, characteristic) => {
      if (error) {
        console.error('[BT] Erro na notificação:', error);
        return;
      }
      
      const value = Buffer.from(characteristic.value, 'base64').toString('utf-8');
      const notification = JSON.parse(value);
      
      // Dispara eventos para listeners
      this.notifyListeners(notification.type, notification);
    }
  );
}
```

**Formato das Notificações:**

```typescript
interface BluetoothNotification {
  type: 'TEMPO_ATUALIZADO' | 'BOMBA_EXPLODIDA' | 'BOMBA_DESARMADA' | 'BOMBA_RESFRIADA';
  data: any;
  timestamp: number;
}
```

**Exemplos:**

```javascript
// Tempo Atualizado (a cada 5s)
{
  "type": "TEMPO_ATUALIZADO",
  "data": {
    "segundosRestantes": 595
  },
  "timestamp": 1767559239763
}

// Bomba Explodiu
{
  "type": "BOMBA_EXPLODIDA",
  "data": {
    "message": "Tempo esgotado!",
    "tempoTotal": 600
  },
  "timestamp": 1767560139763
}

// Bomba Desarmada
{
  "type": "BOMBA_DESARMADA",
  "data": {
    "tempoFinal": 585,
    "message": "Bomba desarmada com sucesso!"
  },
  "timestamp": 1767559265696
}

// Bomba Resfriada
{
  "type": "BOMBA_RESFRIADA",
  "data": {
    "segundosAdicionados": 60,
    "novoTotal": 360
  },
  "timestamp": 1767559665696
}
```

### 🔄 Sistema de Listeners

```javascript
// Adicionar listener
const listenerId = bluetoothService.addListener(
  'TEMPO_ATUALIZADO',
  (notification) => {
    setSecondsRemaining(notification.data.segundosRestantes);
  }
);

// Remover listener
bluetoothService.removeListener('TEMPO_ATUALIZADO', listenerId);
```

**Listeners por Tela:**

| Tela | Listeners Ativos |
|------|-----------------|
| Lobby | - |
| Quiz | `TEMPO_ATUALIZADO`, `BOMBA_EXPLODIDA`, `BOMBA_RESFRIADA` |
| Result (antes de desarmar) | - |
| Result (durante desarme) | `BOMBA_DESARMADA` |

---

## Arquitetura de APIs

### 🏗️ Backend Endpoints

#### Autenticação

```
POST /api/auth
```
- **Body:** `{ nickname, cabinId }`
- **Response:** `{ userId, token, nickname }`
- **Uso:** Login Screen

---

#### Cabine

```
GET /api/cabin/{cabinId}/status
```
- **Response:** `{ cabinId, status, role }`
- **Uso:** Cabin Lobby Screen

---

#### Time

```
GET /api/team/{cabinId}
```
- **Response:** `{ teamId, teamName, leader, members }`
- **Uso:** Cabin Lobby Screen

```
POST /api/team/create
```
- **Body:** `{ cabinId, leaderId, teamName }`
- **Response:** `{ teamId, ... }`
- **Uso:** Cabin Lobby Screen (líder)

```
POST /api/team/{teamId}/join
```
- **Body:** `{ userId, nickname }`
- **Response:** `{ success, team }`
- **Uso:** Cabin Lobby Screen (participante)

---

#### Partida

```
POST /api/match/start
```
- **Body:** `{ teamId, cabinId, leaderId }`
- **Response:** `{ matchId, questions, duration }`
- **Uso:** Lobby Screen (líder)

```
POST /api/match/{matchId}/answer
```
- **Body:** `{ userId, questionId, answer, timestamp }`
- **Response:** `{ correct, points, correctAnswer }`
- **Uso:** Quiz Screen

```
POST /api/match/{matchId}/finish
```
- **Body:** `{ result, score, answers, duration }`
- **Response:** `{ finalScore, ranking, achievements }`
- **Uso:** Result Screen

---

### 🔌 WebSocket Events

#### Conexão

```javascript
const ws = new WebSocket('ws://api.rodarico.com/ws');

ws.on('connect', () => {
  ws.emit('authenticate', { token: authToken });
});
```

#### Events - Time

```javascript
// Entrar no time
ws.emit('team:join', { teamId, userId });

// Novo membro entrou
ws.on('team:member_joined', (data) => {
  // { userId, nickname, timestamp }
});

// Membro saiu
ws.on('team:member_left', (data) => {
  // { userId, reason }
});
```

#### Events - Partida

```javascript
// Iniciar partida (líder)
ws.emit('match:start', { teamId, matchId });

// Partida iniciada (broadcast)
ws.on('match:start', (data) => {
  // { matchId, startedBy, timestamp }
});

// Enviar resposta
ws.emit('match:answer', { matchId, questionId, answer });

// Resposta de outro jogador (broadcast)
ws.on('match:answer', (data) => {
  // { userId, questionId, correct }
});

// Atualização de tempo (broadcast)
ws.on('match:time_update', (data) => {
  // { segundosRestantes }
});

// Partida finalizada
ws.on('match:finished', (data) => {
  // { matchId, result, finalScore }
});
```

---

## 📊 Diagrama de Arquitetura Completa

```
┌────────────────────────────────────────────────────┐
│                  MOBILE APP                        │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   QR     │→ │  Login   │→ │  Cabin   │       │
│  │ Scanner  │  │          │  │  Lobby   │       │
│  └──────────┘  └──────────┘  └─────┬────┘       │
│                                      │            │
│                               ┌──────┴──────┐    │
│                               │             │    │
│                               v             v    │
│                        ┌──────────┐  ┌──────────┐
│                        │   BT     │  │  Lobby   │
│                        │ Connect  │  │  (Mock)  │
│                        └─────┬────┘  └─────┬────┘
│                              │             │     │
│                              └──────┬──────┘     │
│                                     │            │
│                                     v            │
│                              ┌──────────┐        │
│                              │  Lobby   │        │
│                              │  Screen  │        │
│                              └─────┬────┘        │
│                                    │             │
│                                    v             │
│                              ┌──────────┐        │
│                              │   Quiz   │        │
│                              └─────┬────┘        │
│                                    │             │
│                                    v             │
│                              ┌──────────┐        │
│                              │  Result  │        │
│                              └─────┬────┘        │
│                                    │             │
│                                    v             │
│                              [Voltar ao Início]  │
│                                                  │
└────────────────────────────────────────────────┘
         │                │                │
         │                │                │
         v                v                v
┌────────────┐   ┌────────────┐   ┌────────────┐
│  Backend   │   │  WebSocket │   │  ESP32     │
│  REST API  │   │  Server    │   │  Bluetooth │
└────────────┘   └────────────┘   └────────────┘
```

---

## 🎯 Resumo de Fluxos

### Modo Real (Produção)

1. **QR Scanner** → Captura dados da cabine
2. **Login** → Autentica com backend
3. **Cabin Lobby** → Determina role (líder/participante)
4. **[Líder] BT Connection** → Conecta ao ESP32 via Bluetooth
5. **Lobby** → Conecta WebSocket, aguarda time
6. **[Líder] Inicia** → Envia comando BT `INICIAR` + API `POST /match/start`
7. **Quiz** → Recebe notificações BT de timer + Envia respostas via API
8. **Result** → Mostra resultado + [Se sucesso] Envia BT `DESARMAR`
9. **Reset** → Volta ao QR Scanner

### Modo Mock (Debug/Desenvolvimento)

1. **QR Scanner** → [Botão Mock] Gera QR fake
2. **Login** → Simula autenticação local
3. **Cabin Lobby** → Atribui role aleatório
4. **Lobby** → Lista de jogadores mock, sem WebSocket
5. **[Qualquer Role] Inicia** → Botão debug força início
6. **Quiz** → Timer mock local, respostas validadas localmente
7. **Result** → Comando BT mock para desarmar
8. **Reset** → Volta ao QR Scanner

---

## 📝 Notas de Implementação

### Tratamento de Erros

Cada tela deve tratar:
- **Erro de Rede:** Toast/alerta + opção de retry
- **Timeout:** Mensagem clara + voltar/tentar novamente
- **Erro de Bluetooth:** Navegação para `BluetoothConnectionError` screen
- **Erro de API:** Log + feedback ao usuário

### Performance

- **WebSocket:** Reconexão automática em caso de queda
- **Bluetooth:** Retry automático na conexão (3 tentativas)
- **Cache:** Perguntas carregadas mantidas em memória durante o jogo
- **Debounce:** Input de respostas tem debounce de 300ms

### Segurança

- **Token JWT:** Armazenado em `GameContext`, enviado em headers de API
- **Validação de QR:** Verifica formato e campos obrigatórios
- **Rate Limiting:** Respostas limitadas a 1 por segundo

---

**Documento criado em:** 04/01/2026  
**Versão:** 1.0  
**Autor:** Sistema de Documentação RodaRico

