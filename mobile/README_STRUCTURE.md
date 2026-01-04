# Estrutura do Projeto

## 📱 Versões do App

Este projeto mantém **duas versões** do aplicativo:

- **Versão Básica** (`App.tsx`): Apenas Bluetooth e controle de estímulos
- **Versão Completa** (`AppFull.tsx`): App completo com todas as funcionalidades de jogo

Veja `README_APPS.md` para mais detalhes sobre como alternar entre as versões.

---

## 📁 Organização de Pastas

```
mobile/
├── components/          # Componentes reutilizáveis
│   ├── Button.tsx      # Botão customizado
│   ├── StatusIndicator.tsx  # Indicador de status
│   └── index.ts        # Barrel exports
│
├── screens/            # Telas do aplicativo
│   ├── BluetoothConnectionScreen.tsx  # Tela de conexão
│   └── ControlScreen.tsx             # Tela de controle
│
├── services/           # Serviços e lógica de negócio
│   └── BluetoothService.ts  # Serviço Bluetooth
│
├── types/              # Definições de tipos TypeScript
│   └── bluetooth.ts    # Tipos relacionados ao Bluetooth
│
├── constants/           # Constantes do aplicativo
│   ├── app.ts          # Constantes gerais (cores, timeouts)
│   └── bluetooth.ts    # Constantes Bluetooth (comandos, labels)
│
├── App.tsx              # Versão básica (Bluetooth apenas)
├── AppFull.tsx          # Versão completa (jogo completo)
├── index.ts             # Ponto de entrada (seleciona qual app usar)
├── config/
│   └── appMode.ts       # Configuração do modo do app
├── app.json             # Configuração Expo/App Store
└── package.json         # Dependências
```

## 🎯 Funcionalidades

### Versão Básica
- ✅ Conexão automática ao dispositivo "Bomba" via Bluetooth
- ✅ Tela de controle com botões de estímulos
- ✅ Comandos disponíveis: INICIAR, DESARMAR, ACELERAR, EXPLODIR, REINICIAR
- ✅ Modo de teste (mock) para desenvolvimento
- ✅ Feedback visual de status de conexão

### Configuração App Store
- Bundle ID: `br.com.rn360.rodaricoteste`
- Permissões Bluetooth configuradas
- Descrições de uso em português

## 🚀 Como Usar

1. **Conexão**: Ao abrir o app, ele busca automaticamente o dispositivo "Bomba"
2. **Controle**: Após conectar, use os botões para enviar comandos
3. **Teste**: Use "Pular conexão" para testar sem dispositivo físico

## 📝 Comandos Bluetooth

- **INICIAR**: Inicia o dispositivo
- **DESARMAR**: Desarma o dispositivo
- **ACELERAR**: Acelera o dispositivo
- **EXPLODIR**: Explode o dispositivo
- **REINICIAR**: Reinicia o dispositivo

## 🎨 Tema

Cores principais definidas em `constants/app.ts`:
- Background: `#0b1320`
- Primary: `#3b82f6`
- Success: `#10b981`
- Danger: `#ef4444`




