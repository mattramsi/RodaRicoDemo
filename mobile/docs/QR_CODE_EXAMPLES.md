# 📱 Exemplos de QR Code - Prontos para Gerar

## 🎯 Textos JSON para Gerar QR Codes

### **Cabine de Produção #1**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":1,"bluetoothName":"ESP32_BOMB_01"}
```

**Copie e cole em:** https://www.qr-code-generator.com/

---

### **Cabine de Produção #2**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":2,"bluetoothName":"ESP32_BOMB_02"}
```

---

### **Cabine de Produção #3**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":3,"bluetoothName":"ESP32_BOMB_03"}
```

---

### **Cabine de Produção #4**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":4,"bluetoothName":"ESP32_BOMB_04"}
```

---

### **Cabine de Produção #5**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":5,"bluetoothName":"ESP32_BOMB_05"}
```

---

## 🧪 Cabines de Desenvolvimento/Teste

### **Cabine DEV (Mock)**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":999,"bluetoothName":"ESP32_DEV"}
```

**Uso:** Para testes locais sem hardware real

---

### **Cabine de Staging #901**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":901,"bluetoothName":"ESP32_STG_01"}
```

---

### **Cabine de Staging #902**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":902,"bluetoothName":"ESP32_STG_02"}
```

---

## 📋 Template Genérico

**Use este template para criar novas cabines:**

```json
{"v":"1.0","type":"rodarico_cabin","cabinId":X,"bluetoothName":"ESP32_BOMB_XX"}
```

**Substitua:**
- `X` → ID da cabine (número único)
- `XX` → Número com zero à esquerda (01, 02, 03...)

**Exemplos:**
- Cabine 10: `"cabinId":10,"bluetoothName":"ESP32_BOMB_10"`
- Cabine 25: `"cabinId":25,"bluetoothName":"ESP32_BOMB_25"`

---

## 🎨 Versão Formatada (Legível)

**Para debugar ou documentar:**

```json
{
  "v": "1.0",
  "type": "rodarico_cabin",
  "cabinId": 5,
  "bluetoothName": "ESP32_BOMB_05"
}
```

⚠️ **ATENÇÃO:** Use a versão **minificada** (sem espaços/quebras) para QR Codes menores e mais fáceis de escanear!

---

## 🛠️ Ferramentas para Gerar QR Codes

### **Opção 1: Online (Rápido)**

#### **QR Code Generator** (Recomendado)
https://www.qr-code-generator.com/
1. Cole o JSON minificado
2. Clique em "Create QR Code"
3. Baixe como PNG (tamanho: médio ou grande)

#### **QR Code Monkey**
https://www.qrcode-monkey.com/
1. Cole o JSON
2. Customize cores (preto/branco recomendado)
3. Download em alta qualidade

#### **QR Tiger**
https://www.qrcode-tiger.com/
- Opção: QR Code estático (free)

---

### **Opção 2: Node.js Script**

```bash
npm install qrcode
```

```javascript
// generate-qr.js
const QRCode = require('qrcode');

const cabins = [
  { id: 1, bluetooth: 'ESP32_BOMB_01' },
  { id: 2, bluetooth: 'ESP32_BOMB_02' },
  { id: 3, bluetooth: 'ESP32_BOMB_03' },
  { id: 4, bluetooth: 'ESP32_BOMB_04' },
  { id: 5, bluetooth: 'ESP32_BOMB_05' },
];

cabins.forEach(cabin => {
  const data = JSON.stringify({
    v: '1.0',
    type: 'rodarico_cabin',
    cabinId: cabin.id,
    bluetoothName: cabin.bluetooth
  });
  
  const filename = `cabin_${cabin.id}.png`;
  
  QRCode.toFile(filename, data, {
    errorCorrectionLevel: 'M',
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  }, (err) => {
    if (err) console.error(err);
    else console.log(`✅ ${filename} criado`);
  });
});
```

**Execute:**
```bash
node generate-qr.js
```

**Resultado:** 5 arquivos PNG (cabin_1.png, cabin_2.png, etc.)

---

### **Opção 3: Python Script**

```bash
pip install qrcode[pil]
```

```python
# generate_qr.py
import qrcode
import json

cabins = [
    {'id': 1, 'bluetooth': 'ESP32_BOMB_01'},
    {'id': 2, 'bluetooth': 'ESP32_BOMB_02'},
    {'id': 3, 'bluetooth': 'ESP32_BOMB_03'},
    {'id': 4, 'bluetooth': 'ESP32_BOMB_04'},
    {'id': 5, 'bluetooth': 'ESP32_BOMB_05'},
]

for cabin in cabins:
    data = json.dumps({
        'v': '1.0',
        'type': 'rodarico_cabin',
        'cabinId': cabin['id'],
        'bluetoothName': cabin['bluetooth']
    }, separators=(',', ':'))  # Minificado
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color='black', back_color='white')
    filename = f'cabin_{cabin["id"]}.png'
    img.save(filename)
    print(f'✅ {filename} criado')
```

**Execute:**
```bash
python generate_qr.py
```

---

### **Opção 4: Arduino/ESP32 (Embedded)**

```cpp
#include <ArduinoJson.h>
#include <qrcode.h>

void generateCabinQRCode(int cabinId) {
  // Criar JSON minificado
  StaticJsonDocument<128> doc;
  doc["v"] = "1.0";
  doc["type"] = "rodarico_cabin";
  doc["cabinId"] = cabinId;
  
  char bluetoothName[20];
  sprintf(bluetoothName, "ESP32_BOMB_%02d", cabinId);
  doc["bluetoothName"] = bluetoothName;
  
  // Serializar sem espaços
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  Serial.println("JSON: " + jsonStr);
  
  // Gerar QR Code
  QRCode qrcode;
  uint8_t qrcodeData[qrcode_getBufferSize(3)];
  qrcode_initText(&qrcode, qrcodeData, 3, ECC_MEDIUM, jsonStr.c_str());
  
  // Exibir no display
  displayQROnScreen(&qrcode);
}

void setup() {
  Serial.begin(115200);
  
  // Exemplo: Cabine 5
  generateCabinQRCode(5);
}
```

---

## 📐 Tamanhos Recomendados

### **Para Impressão**

| Uso | Tamanho | Formato |
|-----|---------|---------|
| Etiqueta pequena | 3x3 cm | PNG 600 DPI |
| Etiqueta média | 5x5 cm | PNG 600 DPI |
| Placa A4 | 10x10 cm | PNG 300 DPI |
| Banner | 20x20 cm | SVG (vetorial) |

### **Para Display Eletrônico**

| Display | Resolução QR | Formato |
|---------|--------------|---------|
| OLED 128x64 | 60x60 px | Bitmap |
| OLED 128x128 | 120x120 px | Bitmap |
| E-Ink 2.9" | 200x200 px | Bitmap |
| Tablet | 512x512 px | PNG |

---

## 🖨️ Template para Impressão (HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QR Code - Cabine #5</title>
  <style>
    @page { size: A4; margin: 0; }
    body {
      margin: 0;
      padding: 40px;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      border: 3px solid #000;
      padding: 30px;
      border-radius: 10px;
    }
    h1 {
      color: #3b82f6;
      font-size: 36px;
      margin: 0 0 20px 0;
    }
    .qr-container {
      margin: 20px 0;
    }
    .instructions {
      font-size: 18px;
      margin: 20px 0;
      font-weight: bold;
    }
    .details {
      font-size: 14px;
      color: #666;
      margin-top: 20px;
    }
    .details div {
      margin: 5px 0;
    }
    @media print {
      body { background: white; }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
</head>
<body>
  <div class="container">
    <h1>🎯 RodaRico - Cabine #5</h1>
    
    <div class="qr-container">
      <div id="qrcode"></div>
    </div>
    
    <div class="instructions">
      📱 Escaneie para Jogar
    </div>
    
    <div class="details">
      <div><strong>ID da Cabine:</strong> 5</div>
      <div><strong>Bluetooth:</strong> ESP32_BOMB_05</div>
      <div><strong>Status:</strong> Disponível</div>
    </div>
  </div>
  
  <script>
    const qrData = '{"v":"1.0","type":"rodarico_cabin","cabinId":5,"bluetoothName":"ESP32_BOMB_05"}';
    
    new QRCode(document.getElementById("qrcode"), {
      text: qrData,
      width: 300,
      height: 300,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  </script>
</body>
</html>
```

**Como usar:**
1. Copie o HTML acima
2. Salve como `cabin-5-qr.html`
3. Abra no navegador
4. Ctrl+P (Imprimir)
5. Salvar como PDF ou imprimir diretamente

---

## 🧪 Testando QR Codes

### **Validar Online**

1. Acesse: https://zxing.org/w/decode.jsp
2. Upload do QR Code (imagem)
3. Verifica se decodifica corretamente
4. Deve mostrar o JSON minificado

### **Validar no App**

1. Gere QR Code de teste (cabinId: 999)
2. Abra app em modo desenvolvimento
3. Escaneie o QR Code
4. Verifique logs no console:
   ```
   [QR] Scanned: { cabinId: 999, bluetoothName: "ESP32_DEV" }
   [QR] Valid: true
   [QR] Version: 1.0
   ```

---

## 📦 Kit Completo de QR Codes (Todas as Cabines)

### **Cabines 1-10 (JSON Minificado)**

```
Cabine 01: {"v":"1.0","type":"rodarico_cabin","cabinId":1,"bluetoothName":"ESP32_BOMB_01"}
Cabine 02: {"v":"1.0","type":"rodarico_cabin","cabinId":2,"bluetoothName":"ESP32_BOMB_02"}
Cabine 03: {"v":"1.0","type":"rodarico_cabin","cabinId":3,"bluetoothName":"ESP32_BOMB_03"}
Cabine 04: {"v":"1.0","type":"rodarico_cabin","cabinId":4,"bluetoothName":"ESP32_BOMB_04"}
Cabine 05: {"v":"1.0","type":"rodarico_cabin","cabinId":5,"bluetoothName":"ESP32_BOMB_05"}
Cabine 06: {"v":"1.0","type":"rodarico_cabin","cabinId":6,"bluetoothName":"ESP32_BOMB_06"}
Cabine 07: {"v":"1.0","type":"rodarico_cabin","cabinId":7,"bluetoothName":"ESP32_BOMB_07"}
Cabine 08: {"v":"1.0","type":"rodarico_cabin","cabinId":8,"bluetoothName":"ESP32_BOMB_08"}
Cabine 09: {"v":"1.0","type":"rodarico_cabin","cabinId":9,"bluetoothName":"ESP32_BOMB_09"}
Cabine 10: {"v":"1.0","type":"rodarico_cabin","cabinId":10,"bluetoothName":"ESP32_BOMB_10"}
```

---

## 🎯 Recomendação Final

### **Para Testes Imediatos:**

**Use este QR Code de DEV:**
```json
{"v":"1.0","type":"rodarico_cabin","cabinId":999,"bluetoothName":"ESP32_DEV"}
```

1. Copie o texto acima
2. Cole em: https://www.qr-code-generator.com/
3. Baixe a imagem
4. Escaneie no app
5. Teste o fluxo completo

### **Para Produção:**

1. Gere QR Codes para todas as cabines (1-10 ou quantas tiver)
2. Imprima em alta qualidade (300 DPI mínimo)
3. Plastifique ou use protetor
4. Cole nas cabines físicas
5. Teste cada QR Code antes de usar

---

## 🔗 Links Úteis

- **Gerar QR Code:** https://www.qr-code-generator.com/
- **Validar QR Code:** https://zxing.org/w/decode.jsp
- **Biblioteca Node.js:** https://www.npmjs.com/package/qrcode
- **Biblioteca Python:** https://pypi.org/project/qrcode/
- **Biblioteca Arduino:** https://github.com/ricmoo/QRCode

---

**Criado em:** 2026-01-04  
**Atualizado em:** 2026-01-04  
**Versão:** 1.0

