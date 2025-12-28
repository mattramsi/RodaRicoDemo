# 🚀 Guia de Início Rápido - RodaRico Controle Simples

## 📱 App Criado

Localização: `/Users/matheussilva/Documents/RodaRico/mobile-simple`

## ✅ O que foi implementado

### Telas:
1. **Tela de Conexão Bluetooth** (`BluetoothConnectionScreen.tsx`)
   - Botão "Procurar Dispositivos"
   - Lista de dispositivos encontrados (filtrado por "Bomba")
   - Botão de conexão para cada dispositivo
   - Botão "Modo Teste (Mock)" para desenvolvimento

2. **Tela de Controle** (`ControlScreen.tsx`)
   - 5 botões de comando:
     - 🟢 **INICIAR** - Inicia o dispositivo
     - ⚪ **DESARMAR** - Desarma a bomba
     - 🟡 **ACELERAR** - Acelera o timer
     - 🔴 **EXPLODIR** - Explode a bomba
     - 🔵 **REINICIAR** - Reinicia o dispositivo
   - Botão "← Voltar e Desconectar"
   - Indicador de status de conexão
   - Feedback visual de comandos enviados

### Serviços:
- **BluetoothService** - Gerencia toda comunicação Bluetooth
- Filtro automático por dispositivos contendo "Bomba" no nome
- Suporte para modo mock (teste sem dispositivo)

## 🎯 Configurações iOS

**Bundle Identifier:** `br.com.rn360.rodaricoteste`
**App Name:** App Roda Rico Teste
**SKU:** `br.com.rn360.rodaricoteste`

## 🔧 Como Executar

### 1. Instalar Dependências (já feito):
```bash
cd /Users/matheussilva/Documents/RodaRico/mobile-simple
npm install
```

### 2. Para iOS:

#### Opção A - Usar Expo Go (Desenvolvimento):
```bash
npx expo start
# Pressione 'i' para abrir no simulador iOS
```

#### Opção B - Build Nativo (Recomendado para Bluetooth real):
```bash
npx expo run:ios
```

### 3. Para Android:
```bash
npx expo run:android
```

## 📋 Fluxo do App

```
[Tela de Conexão]
       ↓
   Procurar Dispositivos
       ↓
   Selecionar "Bomba"
       ↓
   Conectando...
       ↓
[Tela de Controle]
   - Iniciar
   - Desarmar  
   - Acelerar
   - Explodir
   - Reiniciar
       ↓
   Voltar e Desconectar
       ↓
[Tela de Conexão]
```

## 🧪 Modo Teste (Mock)

Para testar sem dispositivo físico:
1. Na tela de conexão, clique em "Modo Teste (Mock)"
2. Vai direto para a tela de controle
3. Os comandos serão logados no console
4. Não precisa de dispositivo Bluetooth

## 📱 Permissões

### iOS:
- Localização (quando usar o app)
- Bluetooth (aparece automaticamente ao escanear)

### Android:
- Bluetooth Scan
- Bluetooth Connect
- Localização Precisa

## 🎨 Cores dos Botões

- 🟢 Verde (`#10b981`) - INICIAR
- ⚪ Cinza (`#6b7280`) - DESARMAR
- 🟡 Amarelo (`#f59e0b`) - ACELERAR
- 🔴 Vermelho (`#ef4444`) - EXPLODIR
- 🔵 Azul (`#3b82f6`) - REINICIAR

## 🔍 Debug

### Ver Logs:
```bash
# Terminal 1: Metro bundler
npx expo start

# Terminal 2: Logs iOS
npx react-native log-ios

# Terminal 3: Logs Android
npx react-native log-android
```

### Logs Importantes:
```
Dispositivo "Bomba" encontrado: [nome]
Command sent: INICIAR
[MOCK] Bluetooth command: INICIAR
```

## 📁 Estrutura de Arquivos

```
mobile-simple/
├── App.tsx                              # Componente principal
├── app.json                             # Configurações Expo/iOS/Android
├── screens/
│   ├── BluetoothConnectionScreen.tsx    # Tela de conexão
│   └── ControlScreen.tsx                # Tela de controle
├── services/
│   └── BluetoothService.ts              # Serviço Bluetooth
├── constants/
│   └── bluetooth.ts                     # Constantes e configurações
├── ios/                                 # Pasta nativa iOS (gerada)
├── android/                             # Pasta nativa Android (gerada)
└── README.md                            # Documentação
```

## ⚙️ Personalização

### Mudar nome do dispositivo:
Edite `constants/bluetooth.ts`:
```typescript
export const TARGET_DEVICE_NAME = 'OutroNome';
```

### Adicionar/Remover comandos:
Edite `constants/bluetooth.ts` e `screens/ControlScreen.tsx`

### Mudar cores:
Edite `constants/bluetooth.ts` no objeto `COMMAND_COLORS`

## 🐛 Problemas Comuns

### Dispositivo não aparece:
- Certifique-se que o nome contém "Bomba"
- Verifique se o Bluetooth do dispositivo está ligado
- Verifique permissões (Localização no iOS)

### Erro ao conectar:
- Tente desligar e ligar o Bluetooth do dispositivo
- Feche e abra o app novamente
- Use o modo mock para testar sem dispositivo

### Comandos não são enviados:
- Verifique se está realmente conectado (indicador verde)
- Veja os logs no console
- Teste com modo mock primeiro

## 📦 Build para Produção

### iOS (TestFlight/App Store):
```bash
eas build --platform ios
```

### Android (Play Store):
```bash
eas build --platform android
```

## 🎉 Pronto!

O app está configurado e pronto para usar!

Para iniciar:
```bash
cd /Users/matheussilva/Documents/RodaRico/mobile-simple
npx expo run:ios
```

---

**Desenvolvido por:** RN360
**Versão:** 1.0.0
**Data:** Dezembro 2025

