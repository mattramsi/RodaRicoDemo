# RodaRico - Jogo de Desarme de Bomba

Aplicação React Native para o jogo de desarme de bomba com integração Bluetooth.

## Instalação

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

## Estrutura

- `/services`: Serviços para autenticação, Bluetooth, WebSocket e perguntas
- `/screens`: Telas da aplicação (Login, Bluetooth, Times, Lobby, Quiz, Result, PlayAgain)
- `/context`: Contexto React para gerenciamento de estado do jogo

## Fluxo do Sistema

1. **Login** → Autenticação via HTTP POST `/api/auth`
2. **Conectar Bluetooth** → Scan e conexão com cabine (com opção de pular para testes)
3. **Times** → Criar/entrar em times via WebSocket `/ws/time`
4. **Lobby** → Espera e inicia partida
5. **Quiz** → Responde perguntas (10 min timer, 5 perguntas)
6. **Resultado** → Mostra pontuação e desarma bomba
7. **Jogar Novamente** → Reset do jogo ou volta ao lobby

## Comandos Bluetooth

- `INICIAR`: Ao iniciar partida/armar bomba
- `DESARMAR`: Ao finalizar partida com sucesso
- `ACELERAR`: A cada resposta errada
- `EXPLODIR`: Se tempo zerar ou errar todas
- `REINICIAR`: Tela de jogar novamente

## Estados do Jogo

- `idle` → `connectingBT` → `ready` → `arming` → `armed` → `answering` → `disarming` → `finished`

