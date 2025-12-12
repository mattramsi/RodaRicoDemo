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
   - Suporte para todos os comandos WS necessários

4. **QuestionService** (`services/QuestionService.ts`)
   - Busca de perguntas aleatórias via GET `/perguntas/random/5`

### Telas
1. **LoginScreen** - Autenticação com nickname
2. **BluetoothConnectionScreen** - Scan, conexão e opção de pular
3. **TeamsScreen** - Criar/entrar em times via WebSocket
4. **LobbyScreen** - Inicia partida, conecta WS partida
5. **QuizScreen** - Timer 10 min, progress 1/5 a 5/5, respostas, comandos Bluetooth
6. **ResultScreen** - Exibe pontuação, botão desarmar
7. **PlayAgainScreen** - Jogar novamente ou voltar ao lobby

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
4. **Lobby** → "Iniciar desarme" → WS `/ws/partida` → iniciarPartida → Bluetooth INICIAR → GET `/perguntas/random/5` → Quiz
5. **Quiz** → Timer 10:00, progress 1/5 → Responde → WS answerPerguntas → Se errou: Bluetooth ACELERAR → Se tempo zerou: Bluetooth EXPLODIR → Resultado
6. **Resultado** → Mostra score → "Desarmar Bomba" → Bluetooth DESARMAR + WS finalizarPartida (desarme automático via WS)
7. **Jogar Novamente** → Bluetooth REINICIAR → Reset estado → Volta ao Lobby

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

### 2. Ajustes Baseados na API Real

Alguns tipos de mensagens WebSocket podem precisar de ajuste conforme a API real:

- `partidaIniciada` - Pode ter nome diferente
- `answerResult` - Estrutura de resposta pode variar
- `timeCreated`, `timeJoined` - Verificar nomes exatos das mensagens

### 3. Melhorias Sugeridas

1. **cabineId**: Atualmente usa hash simples. Ideal seria:
   - Armazenar ID real quando conectar Bluetooth
   - Usar UUID do dispositivo ou ID fornecido pelo servidor

2. **Score Updates**: Atualmente atualiza quando recebe resposta. Pode precisar:
   - Listener dedicado para atualizações de score
   - Sincronização periódica com servidor

3. **Reconexão durante Quiz**: Implementar pausa de inputs quando BT/WS desconecta

4. **Validação de Respostas**: Verificar se todas as perguntas foram respondidas antes de finalizar

5. **Tratamento de Erros**: Melhorar feedback visual para erros de conexão

## 📝 Notas

- O servidor é a fonte de verdade para pontuação
- Bluetooth mock mode permite testar sem dispositivo físico
- WebSocket tem reconexão automática com backoff exponencial
- Timer do quiz inicia em 600 segundos (10 minutos)

## 🔧 Configuração

Certifique-se de que o `app.json` tem as permissões Bluetooth configuradas (já está configurado).

Para iOS, pode ser necessário ajustar `Info.plist` se houver problemas com Bluetooth.

