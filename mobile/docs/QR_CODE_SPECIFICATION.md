# 📱 QR Code Specification - RodaRico Cabins

## 🎯 Objetivo

Definir formato padrão de QR Code que será exibido nas cabines físicas (ESP32) para permitir que jogadores:
1. Identifiquem a cabine específica
2. Obtenham nome do dispositivo Bluetooth
3. Entrem na sala virtual da cabine

---

## 📋 Formato do QR Code

### **Versão 1.0 (Atual)**

**Formato:** JSON String

```json
{
  "v": "1.0",
  "type": "rodarico_cabin",
  "cabinId": 5,
  "bluetoothName": "ESP32_BOMB_05",
  "hardware": {
    "version": "v2.1",
    "firmware": "1.0.3"
  },
  "timestamp": "2026-01-04T15:30:00Z"
}
```

### **Campos**

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `v` | string | ✅ | Versão do formato QR Code | `"1.0"` |
| `type` | string | ✅ | Identificador fixo do app | `"rodarico_cabin"` |
| `cabinId` | number | ✅ | ID único da cabine no sistema | `5` |
| `bluetoothName` | string | ✅ | Nome do dispositivo BLE | `"ESP32_BOMB_05"` |
| `hardware.version` | string | ❌ | Versão do hardware | `"v2.1"` |
| `hardware.firmware` | string | ❌ | Versão do firmware | `"1.0.3"` |
| `timestamp` | string | ❌ | Data/hora de geração (ISO 8601) | `"2026-01-04T15:30:00Z"` |

---

## 🔍 Validação do QR Code (App)

### **Fluxo de Validação**

```typescript
interface QRCodeData {
  v: string;
  type: string;
  cabinId: number;
  bluetoothName: string;
  hardware?: {
    version?: string;
    firmware?: string;
  };
  timestamp?: string;
}

function validateQRCode(rawData: string): QRCodeData | null {
  try {
    // 1. Parse JSON
    const data = JSON.parse(rawData);
    
    // 2. Validar tipo
    if (data.type !== 'rodarico_cabin') {
      throw new Error('QR Code inválido: tipo incorreto');
    }
    
    // 3. Validar versão
    if (!data.v || !isCompatibleVersion(data.v)) {
      throw new Error(`Versão do QR Code não suportada: ${data.v}`);
    }
    
    // 4. Validar cabinId
    if (!data.cabinId || typeof data.cabinId !== 'number' || data.cabinId < 1 || data.cabinId > 9999) {
      throw new Error('cabinId inválido');
    }
    
    // 5. Validar bluetoothName
    if (!data.bluetoothName || typeof data.bluetoothName !== 'string' || data.bluetoothName.length < 3) {
      throw new Error('bluetoothName inválido');
    }
    
    // 6. Validar timestamp (se presente)
    if (data.timestamp) {
      const qrTime = new Date(data.timestamp);
      const now = new Date();
      const diffHours = (now.getTime() - qrTime.getTime()) / (1000 * 60 * 60);
      
      // QR Code muito antigo (> 24h)
      if (diffHours > 24) {
        console.warn('QR Code foi gerado há mais de 24h');
      }
    }
    
    return data as QRCodeData;
    
  } catch (error) {
    console.error('Erro ao validar QR Code:', error);
    return null;
  }
}

function isCompatibleVersion(version: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  // App suporta v1.x
  return major === 1;
}
```

---

## 🖼️ Geração do QR Code (ESP32)

### **Código Exemplo (Arduino/ESP32)**

```cpp
#include <ArduinoJson.h>
#include <qrcode.h>
#include <time.h>

// Configuração da cabine
const int CABIN_ID = 5;
const char* BLUETOOTH_NAME = "ESP32_BOMB_05";
const char* HARDWARE_VERSION = "v2.1";
const char* FIRMWARE_VERSION = "1.0.3";

String generateQRCodeData() {
  // Criar JSON
  StaticJsonDocument<512> doc;
  
  doc["v"] = "1.0";
  doc["type"] = "rodarico_cabin";
  doc["cabinId"] = CABIN_ID;
  doc["bluetoothName"] = BLUETOOTH_NAME;
  
  JsonObject hardware = doc.createNestedObject("hardware");
  hardware["version"] = HARDWARE_VERSION;
  hardware["firmware"] = FIRMWARE_VERSION;
  
  // Timestamp (requer RTC ou NTP)
  char timestamp[30];
  getISOTimestamp(timestamp);
  doc["timestamp"] = timestamp;
  
  // Serializar para string
  String output;
  serializeJson(doc, output);
  
  return output;
}

void displayQRCode() {
  String qrData = generateQRCodeData();
  
  // Gerar QR Code (biblioteca qrcode)
  QRCode qrcode;
  uint8_t qrcodeData[qrcode_getBufferSize(3)]; // Version 3
  qrcode_initText(&qrcode, qrcodeData, 3, ECC_LOW, qrData.c_str());
  
  // Exibir no display OLED ou e-ink
  displayOnScreen(&qrcode);
  
  // Log serial
  Serial.println("QR Code gerado:");
  Serial.println(qrData);
}

void getISOTimestamp(char* buffer) {
  time_t now = time(nullptr);
  struct tm* timeinfo = gmtime(&now);
  strftime(buffer, 30, "%Y-%m-%dT%H:%M:%SZ", timeinfo);
}
```

---

## 📐 Especificações Visuais

### **Tamanho do QR Code**

| Display | Tamanho Recomendado | DPI |
|---------|-------------------|-----|
| OLED 128x64 | 60x60 pixels | - |
| OLED 128x128 | 120x120 pixels | - |
| E-Ink 2.9" | 200x200 pixels | 150 |
| Papel Impresso | 5x5 cm | 300 |

### **Error Correction Level**

- **Recomendado:** ECC_MEDIUM (15% de dados recuperáveis)
- **Mínimo:** ECC_LOW (7%)
- **Máximo:** ECC_HIGH (30%) - usar se houver risco de danificação

### **Cores**

```
Fundo: Branco (#FFFFFF)
QR Code: Preto (#000000)
Margem: Mínimo 4 módulos (quiet zone)
```

---

## 🎨 Layout Visual Completo

```
┌───────────────────────────────────┐
│                                   │
│   🎯 RodaRico - Cabine #5        │
│                                   │
│   ┌─────────────────────┐         │
│   │                     │         │
│   │   [QR CODE HERE]    │         │
│   │                     │         │
│   └─────────────────────┘         │
│                                   │
│   📱 Escaneie para jogar          │
│                                   │
│   🔹 Bluetooth: ESP32_BOMB_05     │
│   🔹 Status: Disponível           │
│                                   │
└───────────────────────────────────┘
```

### **Implementação HTML (Display Web)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Cabine #5 - RodaRico</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #0b1320;
      color: white;
      margin: 0;
    }
    .container {
      text-align: center;
      background: #1a2332;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 { color: #3b82f6; margin-bottom: 20px; }
    #qrcode { margin: 20px auto; }
    .info { margin-top: 20px; font-size: 14px; }
    .status { color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Cabine #5</h1>
    <div id="qrcode"></div>
    <p class="info">📱 Escaneie para jogar</p>
    <p class="info">🔹 Bluetooth: <strong>ESP32_BOMB_05</strong></p>
    <p class="info">🔹 Status: <span class="status">Disponível</span></p>
  </div>
  
  <script>
    const qrData = {
      v: "1.0",
      type: "rodarico_cabin",
      cabinId: 5,
      bluetoothName: "ESP32_BOMB_05",
      hardware: {
        version: "v2.1",
        firmware: "1.0.3"
      },
      timestamp: new Date().toISOString()
    };
    
    new QRCode(document.getElementById("qrcode"), {
      text: JSON.stringify(qrData),
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  </script>
</body>
</html>
```

---

## 🔄 Versionamento

### **Versão 1.0 (Atual)**
- ✅ Campos básicos: `cabinId`, `bluetoothName`
- ✅ Metadados opcionais: `hardware`, `timestamp`

### **Versão 1.1 (Planejado)**
```json
{
  "v": "1.1",
  "type": "rodarico_cabin",
  "cabinId": 5,
  "bluetoothName": "ESP32_BOMB_05",
  "sessionToken": "cab5_sess_a3f7b9c1", // ← NOVO: Token de sessão único
  "hardware": {
    "version": "v2.1",
    "firmware": "1.0.3",
    "batteryLevel": 85 // ← NOVO: Nível de bateria (%)
  },
  "timestamp": "2026-01-04T15:30:00Z",
  "expiresAt": "2026-01-04T16:30:00Z" // ← NOVO: Validade do QR Code
}
```

**Mudanças:**
- `sessionToken`: Token único por sessão (evita reutilização)
- `expiresAt`: QR Code expira após X tempo (força regeneração)
- `batteryLevel`: Indicador de bateria do ESP32

---

## 🧪 QR Codes de Teste

### **Cabine de Desenvolvimento**

```json
{
  "v": "1.0",
  "type": "rodarico_cabin",
  "cabinId": 999,
  "bluetoothName": "ESP32_DEV",
  "hardware": {
    "version": "dev",
    "firmware": "0.0.1-dev"
  },
  "timestamp": "2026-01-04T15:30:00Z"
}
```

**URL para gerar:** https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...

### **Cabines de Staging**

```bash
# Cabine 901
{"v":"1.0","type":"rodarico_cabin","cabinId":901,"bluetoothName":"ESP32_STG_01"}

# Cabine 902
{"v":"1.0","type":"rodarico_cabin","cabinId":902,"bluetoothName":"ESP32_STG_02"}

# Cabine 903
{"v":"1.0","type":"rodarico_cabin","cabinId":903,"bluetoothName":"ESP32_STG_03"}
```

---

## 🔒 Segurança

### **Não Incluir no QR Code:**

❌ Senhas ou credenciais  
❌ Tokens de autenticação  
❌ IPs ou URLs de backend  
❌ Informações pessoais

### **Recomendações:**

✅ Apenas dados públicos não-sensíveis  
✅ QR Code pode ser fotografado por qualquer pessoa  
✅ Validação no backend (não confiar apenas no QR Code)  
✅ Rate limiting para prevenir abuso

---

## 📱 Integração no App

### **QRCodeScannerScreen.tsx (Pseudo-código)**

```typescript
import { Camera } from 'expo-camera';

const QRCodeScannerScreen = () => {
  const handleBarCodeScanned = ({ data }: BarCodeEvent) => {
    // 1. Validar QR Code
    const qrData = validateQRCode(data);
    
    if (!qrData) {
      Alert.alert('QR Code Inválido', 'Este não é um QR Code RodaRico válido');
      return;
    }
    
    // 2. Salvar no contexto
    gameContext.setCabineId(qrData.cabinId);
    gameContext.setBluetoothDeviceName(qrData.bluetoothName);
    
    // 3. Navegar para Login
    navigation.navigate('Login');
  };
  
  return (
    <View>
      <Camera
        onBarCodeScanned={handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: ['qr'],
        }}
      />
      
      {/* Botão Mock para testes */}
      <Button onPress={handleMockQRCode}>
        Usar Cabine Mock (Dev)
      </Button>
    </View>
  );
};
```

---

## 📊 Métricas

### **Logs Importantes**

```typescript
// Quando QR Code é escaneado
console.log('[QR] Scanned:', {
  cabinId: qrData.cabinId,
  bluetoothName: qrData.bluetoothName,
  qrVersion: qrData.v,
  timestamp: qrData.timestamp,
  ageHours: calculateAge(qrData.timestamp)
});

// Quando QR Code é inválido
console.error('[QR] Invalid:', {
  reason: 'missing_cabinId',
  rawData: data
});
```

### **Analytics**

- Taxa de sucesso de scan
- QR Codes inválidos/rejeitados
- Tempo médio de scan
- Cabines mais escaneadas

---

## 🛠️ Ferramentas

### **Gerador Online (Testes)**

```bash
# Node.js script para gerar QR Code
const QRCode = require('qrcode');

const data = {
  v: "1.0",
  type: "rodarico_cabin",
  cabinId: 5,
  bluetoothName: "ESP32_BOMB_05"
};

QRCode.toFile('cabin_5.png', JSON.stringify(data), {
  errorCorrectionLevel: 'M',
  width: 512
});
```

### **Validador Online**

```html
<!-- Ferramenta web para validar QR Code -->
<input type="file" id="qrUpload" accept="image/*">
<pre id="result"></pre>

<script>
  document.getElementById('qrUpload').onchange = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      // Usar biblioteca jsQR para decodificar
      const imageData = event.target.result;
      // ... decode logic
      
      const qrData = JSON.parse(decodedText);
      document.getElementById('result').textContent = 
        JSON.stringify(qrData, null, 2);
    };
    
    reader.readAsDataURL(file);
  };
</script>
```

---

## ✅ Checklist de Implementação

### **Hardware (ESP32)**
- [ ] Implementar geração de JSON
- [ ] Adicionar biblioteca QR Code (qrcode.h)
- [ ] Configurar display (OLED/E-Ink)
- [ ] Implementar sincronização de tempo (NTP)
- [ ] Adicionar botão de regenerar QR Code
- [ ] Testar diferentes tamanhos de display

### **App (React Native)**
- [ ] Adicionar permissões de câmera (AndroidManifest.xml, Info.plist)
- [ ] Implementar QRCodeScannerScreen
- [ ] Implementar validateQRCode()
- [ ] Adicionar modo mock (botão "Cabine Dev")
- [ ] Adicionar feedback visual (frame de scan)
- [ ] Implementar vibração ao escanear
- [ ] Testar com QR Codes reais

### **Backend**
- [ ] Validar cabinId existe no banco
- [ ] Verificar disponibilidade da cabine
- [ ] Log de QR Codes escaneados
- [ ] Endpoint para listar cabines disponíveis

---

**Specification Version:** 1.0  
**Last Updated:** 2026-01-04  
**Status:** 📋 Pronto para Implementação

