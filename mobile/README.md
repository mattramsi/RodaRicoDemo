# RodaRico Mobile - Jogo de Desarme de Bomba

Aplicação React Native para o jogo interativo de desarme de bomba.

## 📦 Instalação

1. Instalar dependências:
```bash
cd mobile
npm install
```

2. Para iOS, também instalar pods:
```bash
cd ios
pod install
cd ..
```

## 📁 Estrutura

- `/services`: Serviços para autenticação, Bluetooth, WebSocket e perguntas
- `/screens`: Telas da aplicação (Login, Bluetooth, Times, Lobby, Quiz, Result, PlayAgain)
- `/context`: Contexto React para gerenciamento de estado do jogo

## 🔄 Fluxo do Sistema

1. **Login** → Autenticação via HTTP POST `/api/auth`
2. **Conectar Bluetooth** → Scan e conexão com cabine (com opção de pular para testes)
3. **Times** → Criar/entrar em times via WebSocket `/ws/time`
4. **Lobby** → Espera e inicia partida
5. **Quiz** → Responde perguntas (10 min timer, 5 perguntas)
6. **Resultado** → Mostra pontuação e desarma bomba
7. **Jogar Novamente** → Reset do jogo ou volta ao TeamsMain

## 📡 Comandos Bluetooth

- `INICIAR`: Ao iniciar partida (sincroniza dispositivo - bomba já armada pelo backend)
- `DESARMAR`: Ao finalizar partida com sucesso (sincroniza dispositivo - bomba já desarmada pelo backend)
- `ACELERAR`: A cada resposta errada
- `EXPLODIR`: Se tempo zerar ou errar todas
- `REINICIAR`: Tela de jogar novamente

## 🎮 Estados do Jogo

- `idle` → `connectingBT` → `ready` → `arming` → `armed` → `answering` → `disarming` → `finished`

## 🔌 Comunicação

### WebSocket
- `/ws/time`: Gerenciamento de times (createTime, getTime, joinTeam)
- `/ws/partida`: Gerenciamento de partidas (iniciarPartida, answerPerguntas, finalizarPartida)

**Importante**: O armar/desarmar da bomba é feito automaticamente pelo backend ao processar `iniciarPartida` e `finalizarPartida`. O frontend apenas envia comandos Bluetooth para sincronizar o dispositivo físico.

### HTTP REST
- `POST /api/auth`: Autenticação
- `GET /api/time`: Lista de times
- `GET /api/time/current`: Time atual do usuário
- `GET /api/perguntas/random/5`: Busca perguntas aleatórias

## 📚 Documentação Completa

Para documentação completa da arquitetura e fluxo, consulte:
- [README.md](../README.md) - Documentação principal do projeto
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Detalhes técnicos da implementação
