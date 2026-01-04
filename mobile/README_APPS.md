# 📱 Versões do Aplicativo

Este projeto mantém **duas versões** do aplicativo:

## 🔵 Versão Básica (`App.tsx`)

**Foco:** Apenas Bluetooth e controle de estímulos

### Funcionalidades:
- ✅ Conexão automática ao dispositivo "Bomba"
- ✅ Tela de controle com 5 botões de comandos:
  - INICIAR
  - DESARMAR
  - ACELERAR
  - EXPLODIR
  - REINICIAR
- ✅ Modo de teste (mock)
- ✅ Feedback visual de status

### Bundle ID:
- `br.com.rn360.rodaricoteste` (configurado no `app.json`)

### Uso:
Ideal para:
- Testes de conexão Bluetooth
- Controle básico do dispositivo
- Versão simplificada para App Store

---

## 🟢 Versão Completa (`AppFull.tsx`)

**Foco:** App completo com todas as funcionalidades de jogo

### Funcionalidades:
- ✅ Login/Autenticação
- ✅ Conexão Bluetooth
- ✅ Sistema de times
- ✅ Lobby
- ✅ Quiz/Perguntas
- ✅ Resultados
- ✅ Sistema de jogo completo

### Bundle ID:
- `br.com.rn360.rodarico` (original)

### Uso:
Ideal para:
- Versão completa do jogo
- Funcionalidades completas
- Sistema de times e quiz

---

## 🔄 Como Alternar Entre Versões

### Opção 1: Via Configuração (Recomendado)

Edite o arquivo `config/appMode.ts`:

```typescript
export const APP_MODE: AppMode = 'basic'; // ou 'full'
```

### Opção 2: Via index.ts

Edite o arquivo `index.ts` diretamente para importar o app desejado.

---

## 📋 Estrutura de Arquivos

```
mobile/
├── App.tsx              # Versão básica (Bluetooth apenas)
├── AppFull.tsx          # Versão completa (jogo completo)
├── index.ts             # Ponto de entrada (seleciona qual app usar)
├── config/
│   └── appMode.ts       # Configuração do modo do app
└── screens/
    ├── ControlScreen.tsx           # Tela de controle (básica)
    ├── BluetoothConnectionScreen.tsx # Conexão (ambas versões)
    ├── LoginScreen.tsx              # Login (completa)
    ├── TeamsMainScreen.tsx          # Times (completa)
    ├── LobbyScreen.tsx              # Lobby (completa)
    ├── QuizScreen.tsx               # Quiz (completa)
    └── ... (outras telas da versão completa)
```

---

## 🚀 Build para App Store

### Versão Básica (Teste):
- Bundle ID: `br.com.rn360.rodaricoteste`
- Configurado no `app.json`
- Pronto para TestFlight

### Versão Completa:
- Bundle ID: `br.com.rn360.rodarico`
- Requer atualização no `app.json` se necessário

---

## 📝 Notas

- Ambas as versões compartilham:
  - `BluetoothService`
  - `BluetoothConnectionScreen` (comportamento adaptado)
  - Componentes reutilizáveis
  - Constantes e tipos

- A versão básica é mais leve e focada apenas em Bluetooth
- A versão completa inclui todo o sistema de jogo




