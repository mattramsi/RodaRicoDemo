# RodaRico - Controle Simples

Versão simplificada do app RodaRico contendo apenas:
- Tela de conexão Bluetooth com dispositivo "Bomba"
- Tela de controle com botões para enviar comandos

## 🚀 Como Executar

### iOS:
```bash
npx expo run:ios
```

### Android:
```bash
npx expo run:android
```

## 📱 Estrutura

- `App.tsx` - Componente principal
- `screens/BluetoothConnectionScreen.tsx` - Tela de conexão
- `screens/ControlScreen.tsx` - Tela de controle
- `services/BluetoothService.ts` - Serviço Bluetooth
- `constants/bluetooth.ts` - Constantes e configurações

## 🎮 Comandos Disponíveis

- **INICIAR** - Inicia o dispositivo
- **DESARMAR** - Desarma a bomba
- **ACELERAR** - Acelera o timer
- **EXPLODIR** - Explode a bomba
- **REINICIAR** - Reinicia o dispositivo

## 📋 Requisitos

- iOS 13+ ou Android 6+
- Dispositivo Bluetooth com nome contendo "Bomba"
- Permissões de Bluetooth e Localização

## 🔧 Configuração iOS

Bundle ID: `br.com.rn360.rodaricoteste`

Certifique-se de que as permissões estão configuradas no Info.plist.

