# Implementação - Jogo de Desarme de Bomba

## ✅ O que foi implementado

### Serviços
1. **AuthService** (`services/AuthService.ts`)
   - Login via POST `/api/auth`
   - Armazenamento de tokens (access_token, refresh_token, expires_in)
   - Renovação automática de token
   - Storage usando AsyncStorage

2. **BluetoothService** (`services/BluetoothService.ts`)
   - Scan e descoberta de dispositivos
   - Conexão e pareamento
   - Fila de comandos com retry (máx 3 tentativas)
   - Modo mock para testes (botão "Pular")
   - Comandos: INICIAR, DESARMAR, ACELERAR, EXPLODIR, REINICIAR
   - Listener de mudanças de conexão

3. **WebSocketService** (`services/WebSocketService.ts`)
   - Conexão para `/ws/time` e `/ws/partida`
   - Reconexão automática com backoff exponencial (1s, 2s, 4s, ... até 30s)
   - Sistema de listeners para mensagens
   - Suporte para todas as ações WebSocket necessárias

4. **QuestionService** (`services/QuestionService.ts`)
   - Busca de perguntas aleatórias via GET `/perguntas/random/5`
   - Renovação automática de token em caso de 401

### Telas
1. **LoginScreen** - Autenticação com nickname
2. **BluetoothConnectionScreen** - Scan, conexão e opção de pular
3. **TeamsMainScreen** - Tela principal com opções de criar/buscar times
4. **CreateTeamScreen** - Criar novo time via WebSocket
5. **BrowseTeamsScreen** - Buscar e entrar em times existentes
6. **LobbyScreen** - Exibe jogadores, inicia partida
7. **QuizScreen** - Timer 10 min, progress 1/5 a 5/5, respostas, comandos Bluetooth
8. **ResultScreen** - Exibe pontuação, botão desarmar
9. **PlayAgainScreen** - Jogar novamente ou voltar ao lobby

### Context/State Management
- **GameContext** - Gerencia estado global do jogo:
  - Estados: idle → connectingBT → ready → arming → armed → answering → disarming → finished
  - Dados: team, players, partidaId, cabineId, questions, answers, score, timeRemaining
  - Funções: setGameState, addAnswer, resetGame, etc.

### Navegação
- React Navigation configurado
- Fluxo completo: Login → Bluetooth → Teams → Lobby → Quiz → Result → PlayAgain
- Type-safe navigation com TypeScript

## 🔄 Fluxo Implementado

1. **Login** → POST `/api/auth` → Armazena tokens
2. **Bluetooth** → Scan → Conectar OU Pular (mock) → Avança para Times
3. **Times** → WS `/ws/time` → createTime/joinTeam → Navega para Lobby
4. **Lobby** → "Iniciar desarme" → WS `/ws/partida` → iniciarPartida → Backend arma bomba automaticamente → Bluetooth INICIAR → GET `/perguntas/random/5` → Quiz
5. **Quiz** → Timer 10:00, progress 1/5 → Responde → WS answerPerguntas → Se errou: Bluetooth ACELERAR → Se tempo zerou: Bluetooth EXPLODIR → Resultado
6. **Resultado** → Mostra score → "Desarmar Bomba" → WS finalizarPartida → Backend desarma bomba automaticamente → Bluetooth DESARMAR
7. **Jogar Novamente** → Bluetooth REINICIAR → Reset estado → Volta ao TeamsMain

## 🔌 Ações WebSocket

### Endpoint `/ws/time`
- `createTime`: Criar novo time
  - Payload: `{ action: 'createTime', data: { nome: string } }`
  - Resposta: `{ success: true, action: 'createTime', data: { data: { response: { id, nome, participantes } } } }`

- `getTime`: Buscar informações do time
  - Payload: `{ action: 'getTime', data: { id: number } }`
  - Resposta: `{ success: true, action: 'getTime', data: { id, nome, participantes } }`

- `joinTeam`: Entrar em um time
  - Payload: `{ action: 'joinTeam', data: { id: number } }`
  - Resposta: `{ success: true, action: 'joinTeam', data: { data: { response: { id, nome, participantes } } } }`

### Endpoint `/ws/partida`
- `iniciarPartida`: Iniciar nova partida
  - Payload: `{ action: 'iniciarPartida', data: { timeId: number, cabineId: number } }`
  - Resposta: `{ success: true, action: 'iniciarPartida', data: { partidaId: number, codigo: number } }`
  - **Backend**: Arma a bomba automaticamente ao processar esta ação

- `answerPerguntas`: Responder pergunta
  - Payload: `{ action: 'answerPerguntas', data: { perguntaId: number, answer: string, partidaId: number } }`
  - Resposta: `{ success: true, action: 'answerPergunta', data: { correct: boolean, pontos: number } }`

- `finalizarPartida`: Finalizar partida
  - Payload: `{ action: 'finalizarPartida', data: { id: number, result: boolean } }`
  - Resposta: `{ success: true, action: 'finalizarPartida', data: { id, result } }`
  - **Backend**: Desarma a bomba automaticamente ao processar esta ação

## 📡 Comandos Bluetooth

Os comandos Bluetooth são enviados para sincronizar o dispositivo físico:

- `INICIAR`: Enviado após `iniciarPartida` (bomba já armada pelo backend)
- `DESARMAR`: Enviado após `finalizarPartida` (bomba já desarmada pelo backend)
- `ACELERAR`: Enviado a cada resposta errada no Quiz
- `EXPLODIR`: Enviado se tempo zerar ou todas respostas erradas
- `REINICIAR`: Enviado na tela PlayAgain

## 🔄 Sincronização Backend/Frontend

### Armar/Desarmar Bomba
- **Backend**: Processa automaticamente ao receber `iniciarPartida` e `finalizarPartida`
- **Frontend**: Envia comandos Bluetooth apenas para sincronizar dispositivo físico
- **Não há** ação WebSocket `armarDesarmarBomba` - foi removida

### Pontuação
- Calculada no frontend baseado nas respostas corretas
- Validada pelo backend ao finalizar partida
- Exibida na tela de Resultado

## ⚠️ Próximos Passos

### 1. Instalar Dependências
```bash
cd mobile
npm install
```

Se houver erros com tipos, pode ser necessário instalar:
```bash
npm install --save-dev @types/react-native
```

### 2. Melhorias Sugeridas

1. **Reconexão durante Quiz**: Implementar pausa de inputs quando BT/WS desconecta
2. **Validação de Respostas**: Verificar se todas as perguntas foram respondidas antes de finalizar
3. **Tratamento de Erros**: Melhorar feedback visual para erros de conexão
4. **Sincronização de Score**: Considerar listener dedicado para atualizações de score do servidor

## 📝 Notas

- O servidor é a fonte de verdade para pontuação
- Bluetooth mock mode permite testar sem dispositivo físico
- WebSocket tem reconexão automática com backoff exponencial
- Timer do quiz inicia em 600 segundos (10 minutos)
- Armar/desarmar bomba é automático pelo backend - frontend apenas sincroniza dispositivo físico

## 🔧 Configuração

Certifique-se de que o `app.json` tem as permissões Bluetooth configuradas (já está configurado).

Para iOS, pode ser necessário ajustar `Info.plist` se houver problemas com Bluetooth.
