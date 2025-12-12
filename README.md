# RodaRico - Jogo de Desarme de Bomba

Aplicação React Native para o jogo interativo de desarme de bomba com integração Bluetooth e comunicação em tempo real via WebSocket.

## 📱 Sobre o Projeto

RodaRico é um jogo multiplayer onde equipes competem para desarmar uma bomba respondendo perguntas corretamente dentro de um tempo limite. O jogo integra dispositivos físicos via Bluetooth para criar uma experiência imersiva.

## 🏗️ Arquitetura

### Stack Tecnológica

- **React Native** (0.81.5) - Framework mobile
- **TypeScript** - Tipagem estática
- **React Navigation** - Navegação entre telas
- **React Context API** - Gerenciamento de estado global
- **WebSocket** - Comunicação em tempo real
- **Bluetooth Low Energy (BLE)** - Integração com dispositivos físicos
- **Expo** (54.0.21) - Ferramentas de desenvolvimento

### Estrutura de Diretórios

```
mobile/
├── services/          # Serviços de comunicação
│   ├── AuthService.ts          # Autenticação HTTP
│   ├── WebSocketService.ts     # Comunicação WebSocket
│   ├── BluetoothService.ts    # Integração BLE
│   └── QuestionService.ts      # Busca de perguntas
├── screens/           # Telas da aplicação
│   ├── LoginScreen.tsx
│   ├── BluetoothConnectionScreen.tsx
│   ├── TeamsMainScreen.tsx
│   ├── CreateTeamScreen.tsx
│   ├── BrowseTeamsScreen.tsx
│   ├── LobbyScreen.tsx
│   ├── QuizScreen.tsx
│   ├── ResultScreen.tsx
│   └── PlayAgainScreen.tsx
├── context/           # Contextos React
│   └── GameContext.tsx         # Estado global do jogo
└── App.tsx            # Componente raiz e navegação
```

## 🔄 Fluxo da Aplicação

### 1. Autenticação (`LoginScreen`)
- **Endpoint**: `POST /api/auth`
- **Body**: `{ grant_type: 'username', nickname: string }`
- **Resposta**: `{ access_token, refresh_token, expires_in }`
- Tokens armazenados no AsyncStorage
- Navega para `BluetoothConnection`

### 2. Conexão Bluetooth (`BluetoothConnectionScreen`)
- Scan de dispositivos BLE próximos
- Conexão com cabine física
- Modo mock disponível (botão "Pular") para testes sem dispositivo
- Navega para `TeamsMain`

### 3. Gerenciamento de Times

#### 3.1 Tela Principal (`TeamsMainScreen`)
- Verifica se usuário já está em um time via `GET /api/time/current`
- Se estiver em time: redireciona automaticamente para `Lobby`
- Se não estiver: mostra opções "Criar Time" ou "Buscar Times"

#### 3.2 Criar Time (`CreateTeamScreen`)
- **WebSocket**: `wss://rodarico.app.br/ws/time`
- **Ação**: `createTime`
- **Payload**: `{ action: 'createTime', data: { nome: string } }`
- **Resposta**: Time criado com ID e participantes
- Navega para `Lobby`

#### 3.3 Buscar Times (`BrowseTeamsScreen`)
- **HTTP**: `GET /api/time` (lista de times disponíveis)
- **WebSocket**: `wss://rodarico.app.br/ws/time`
- **Ação**: `joinTeam`
- **Payload**: `{ action: 'joinTeam', data: { id: number } }`
- **Resposta**: Time atualizado com novo participante
- Navega para `Lobby`

### 4. Lobby (`LobbyScreen`)
- Exibe lista de jogadores do time
- Campo para inserir `cabineId` (input do usuário)
- **WebSocket**: `wss://rodarico.app.br/ws/partida`
- **Ação**: `iniciarPartida`
- **Payload**: `{ action: 'iniciarPartida', data: { timeId: number, cabineId: number } }`
- **Resposta**: `{ partidaId: number, codigo: number }`
- **Backend**: Arma a bomba automaticamente ao processar `iniciarPartida`
- **Bluetooth**: Envia comando `INICIAR` (sincroniza dispositivo físico)
- **HTTP**: `GET /api/perguntas/random/5` (busca perguntas)
- Navega para `Quiz`

### 5. Quiz (`QuizScreen`)
- Timer de 10 minutos (600 segundos)
- Exibe progresso (1/5 a 5/5)
- Mostra nome do time e `partidaId` no header
- Para cada pergunta:
  - **WebSocket**: `wss://rodarico.app.br/ws/partida`
  - **Ação**: `answerPerguntas`
  - **Payload**: `{ action: 'answerPerguntas', data: { perguntaId: number, answer: string, partidaId: number } }`
  - **Resposta**: `{ action: 'answerPergunta', data: { correct: boolean, pontos: number } }`
  - Se correto: acumula pontos
  - Se errado: **Bluetooth** `ACELERAR`
- Se tempo zerar: **Bluetooth** `EXPLODIR` → Navega para `Result`
- Se todas respondidas: Calcula resultado → Navega para `Result`

### 6. Resultado (`ResultScreen`)
- Exibe pontuação acumulada
- Mostra sucesso (✓) ou falha (✗)
- Se sucesso: Botão "Desarmar Bomba"
  - **WebSocket**: `finalizarPartida`
  - **Payload**: `{ action: 'finalizarPartida', data: { id: number, result: boolean } }`
  - **Backend**: Desarma a bomba automaticamente ao processar `finalizarPartida`
  - **Bluetooth**: `DESARMAR` (sincroniza dispositivo físico)
- Botões: "Jogar Novamente" → `TeamsMain` | "Voltar ao Lobby" → `Lobby`

### 7. Jogar Novamente (`PlayAgainScreen`)
- **Bluetooth**: `REINICIAR`
- Opções:
  - "Jogar Novamente" → Navega para `TeamsMain`
  - "Voltar ao Lobby" → Navega para `Lobby`

## 🔌 Comunicação

### WebSocket

#### Endpoint de Times (`/ws/time`)
- **Ações**:
  - `createTime`: Criar novo time
  - `getTime`: Buscar informações do time
  - `joinTeam`: Entrar em um time existente

#### Endpoint de Partidas (`/ws/partida`)
- **Ações**:
  - `iniciarPartida`: Iniciar nova partida
    - **Backend**: Arma a bomba automaticamente ao processar esta ação
    - **Frontend**: Envia comando Bluetooth `INICIAR` para sincronizar dispositivo físico
  - `answerPerguntas`: Responder pergunta
  - `finalizarPartida`: Finalizar partida
    - **Backend**: Desarma a bomba automaticamente ao processar esta ação
    - **Frontend**: Envia comando Bluetooth `DESARMAR` para sincronizar dispositivo físico

**Importante**: O armar/desarmar da bomba é feito automaticamente pelo backend quando `iniciarPartida` e `finalizarPartida` são processados. O frontend apenas envia comandos Bluetooth para sincronizar o dispositivo físico.

### HTTP REST

#### Autenticação
- `POST /api/auth` - Login com nickname
- Renovação automática de token em caso de 401

#### Times
- `GET /api/time` - Lista todos os times disponíveis
- `GET /api/time/current` - Busca time atual do usuário

#### Perguntas
- `GET /api/perguntas/random/5` - Busca 5 perguntas aleatórias

## 🎮 Estados do Jogo

O `GameContext` gerencia os seguintes estados:

```
idle → connectingBT → ready → arming → armed → answering → disarming → finished
```

### Dados Gerenciados
- `team`: Informações do time atual
- `players`: Lista de participantes
- `partidaId`: ID da partida em andamento
- `cabineId`: ID da cabine física
- `questions`: Array de perguntas
- `answers`: Array de respostas
- `score`: Pontuação acumulada
- `timeRemaining`: Tempo restante (segundos)
- `gameState`: Estado atual do jogo
- `gameResult`: Resultado final ('success' | 'fail')

## 📡 Comandos Bluetooth

| Comando | Quando é Enviado | Descrição |
|---------|------------------|-----------|
| `INICIAR` | Ao iniciar partida no Lobby | Sincroniza dispositivo físico (bomba já armada pelo backend) |
| `DESARMAR` | Ao desarmar bomba no Result | Sincroniza dispositivo físico (bomba já desarmada pelo backend) |
| `ACELERAR` | A cada resposta errada no Quiz | Acelera o timer do dispositivo |
| `EXPLODIR` | Se tempo zerar ou todas erradas | Explode a bomba |
| `REINICIAR` | Na tela PlayAgain | Reinicia o dispositivo |

## 🏛️ Arquitetura de Serviços

### AuthService
- Gerencia autenticação via OAuth2-like flow
- Armazena tokens no AsyncStorage
- Renovação automática de token
- Métodos: `login()`, `refreshToken()`, `getAccessToken()`, `clearTokens()`

### WebSocketService
- Gerencia conexões WebSocket para times e partidas
- Reconexão automática com backoff exponencial
- Sistema de listeners para mensagens específicas e genéricas
- Métodos: `connect()`, `send()`, `onMessage()`, `disconnect()`

### BluetoothService
- Gerencia conexão BLE com dispositivos físicos
- Fila de comandos com retry automático (máx 3 tentativas)
- Modo mock para desenvolvimento sem dispositivo
- Métodos: `scanDevices()`, `connectToDevice()`, `sendCommand()`, `disconnect()`

### QuestionService
- Busca perguntas aleatórias do servidor
- Renovação automática de token em caso de 401
- Métodos: `getRandomQuestions(quantity: number)`

## 🎯 Lógica de Negócio

### Cálculo de Resultado
- **Sucesso**: Pelo menos uma resposta correta
- **Falha**: Todas as respostas erradas ou tempo esgotado

### Pontuação
- Acumulada apenas para respostas corretas
- Pontos variam conforme a resposta do servidor
- Exibida na tela de Resultado

### Sincronização Backend/Frontend
- **Bomba**: Armada/desarmada automaticamente pelo backend
- **Bluetooth**: Usado apenas para sincronizar dispositivo físico
- **Pontuação**: Calculada no frontend, validada pelo backend

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js (v16 ou superior)
- npm ou yarn
- React Native CLI
- Xcode (para iOS) ou Android Studio (para Android)
- CocoaPods (para iOS)

### Instalação

```bash
# Clonar repositório
git clone git@github.com:mattramsi/RodaRico.git
cd RodaRico/mobile

# Instalar dependências
npm install

# Para iOS, instalar pods
cd ios
pod install
cd ..
```

### Execução

```bash
# Iniciar Metro bundler
npm start

# iOS
npm run ios
# ou
npx expo run:ios

# Android
npm run android
# ou
npx expo run:android
```

## 🔧 Configuração

### Variáveis de Ambiente

O servidor está configurado em:
- **API Base**: `https://rodarico.app.br/api`
- **WebSocket**: `wss://rodarico.app.br/ws`

### Permissões

#### iOS (`Info.plist`)
- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`
- `NSLocationWhenInUseUsageDescription`

#### Android (`AndroidManifest.xml`)
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `ACCESS_FINE_LOCATION`

## 📝 Estrutura de Mensagens WebSocket

### Formato de Envio
```typescript
{
  action: string,
  data: { ... }
}
```

### Formato de Resposta
```typescript
{
  success: boolean,
  action: string,
  data: { ... },
  error?: string
}
```

### Exemplos

#### Criar Time
```json
{
  "action": "createTime",
  "data": { "nome": "Time Alpha" }
}
```

#### Iniciar Partida
```json
{
  "action": "iniciarPartida",
  "data": {
    "timeId": 1,
    "cabineId": 5
  }
}
```

#### Responder Pergunta
```json
{
  "action": "answerPerguntas",
  "data": {
    "perguntaId": 1,
    "answer": "Brasília",
    "partidaId": 3
  }
}
```

#### Finalizar Partida
```json
{
  "action": "finalizarPartida",
  "data": {
    "id": 8,
    "result": true
  }
}
```

## 🧪 Testes

### Modo Mock Bluetooth
- Disponível na tela de conexão Bluetooth
- Permite testar sem dispositivo físico
- Botão "Pular" ativa o modo mock

## 🔍 Detalhes de Implementação

### WebSocket Reconexão
- Backoff exponencial: 1s, 2s, 4s, 8s, 16s, 30s (máx)
- Máximo de 10 tentativas
- Reconexão automática em caso de queda

### Gerenciamento de Estado
- `GameContext` centraliza todo o estado do jogo
- Hooks customizados para acesso fácil
- Reset automático ao iniciar nova partida

### Tratamento de Erros
- Timeouts configuráveis para operações críticas
- Alertas visuais para feedback ao usuário
- Logs detalhados para debugging

## 📚 Documentação Adicional

- [IMPLEMENTATION.md](./mobile/IMPLEMENTATION.md) - Detalhes técnicos da implementação
- [README.md](./mobile/README.md) - Documentação específica do mobile

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Autores

- **Matheus Silva** - [mattramsi](https://github.com/mattramsi)

---

**Última atualização**: Dezembro 2024
