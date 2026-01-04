# 🔍 Auditoria de Telas Não Utilizadas - RodaRico

## 📊 Resumo Executivo

**Data da Auditoria:** Janeiro 2026  
**Total de Telas:** 16  
**Telas em Uso:** 9  
**Telas Obsoletas:** 7  

---

## ✅ TELAS EM USO (Fluxo Atual)

### Fluxo Principal do Jogo

| # | Tela | Arquivo | Status | Uso |
|---|------|---------|--------|-----|
| 1 | BluetoothPermission | `BluetoothPermissionScreen.tsx` | ✅ Ativa | Solicita permissões BLE |
| 2 | BluetoothBlocked | `BluetoothBlockedScreen.tsx` | ✅ Ativa | Permissão negada |
| 3 | QRCodeScanner | `QRCodeScannerScreen.tsx` | ✅ Ativa | Escanear QR da cabine |
| 4 | Login | `LoginScreen.tsx` | ✅ Ativa | Autenticação do usuário |
| 5 | CabinLobby | `CabinLobbyScreen.tsx` | ✅ Ativa | Determina role (líder/participante) |
| 6 | Lobby | `LobbyScreen.tsx` | ✅ Ativa | Aguarda início do jogo |
| 7 | Quiz | `QuizScreen.tsx` | ✅ Ativa | Responde perguntas |
| 8 | Result | `ResultScreen.tsx` | ✅ Ativa | Mostra resultado e desarma |
| 9 | PlayAgain | `PlayAgainScreen.tsx` | ✅ Ativa | Opções pós-jogo |

### Telas de Erro (Usadas quando necessário)

| # | Tela | Arquivo | Status | Uso |
|---|------|---------|--------|-----|
| 10 | BluetoothConnectionError | `BluetoothConnectionErrorScreen.tsx` | ⚠️ Condicional | Erros de conexão BLE |

---

## ❌ TELAS OBSOLETAS (Não Mais Utilizadas)

### 1. **TeamsMainScreen** 🗑️
- **Arquivo:** `TeamsMainScreen.tsx`
- **Função Original:** Escolher entre criar ou buscar time
- **Por que está obsoleta:**
  - No novo fluxo de cabine, o time é criado **automaticamente**
  - WebSocket `/ws/cabin` determina líder/participante
  - Não há mais escolha manual
- **Última Referência:** `App.tsx` (linha 243) - mas nunca navegada em modo mock
- **Recomendação:** ❌ **REMOVER**

### 2. **CreateTeamScreen** 🗑️
- **Arquivo:** `CreateTeamScreen.tsx`
- **Função Original:** Formulário para criar novo time
- **Por que está obsoleta:**
  - Times são criados automaticamente no `CabinLobbyScreen`
  - Líder não precisa mais criar time manualmente
- **Última Referência:** `App.tsx` (linha 260) - navegada de `TeamsMain`
- **Recomendação:** ❌ **REMOVER**

### 3. **BrowseTeamsScreen** 🗑️
- **Arquivo:** `BrowseTeamsScreen.tsx`
- **Função Original:** Listar e entrar em times existentes
- **Por que está obsoleta:**
  - Participantes entram automaticamente no time do líder
  - Não há mais busca manual de times
- **Última Referência:** `App.tsx` (linha 271) - navegada de `TeamsMain`
- **Recomendação:** ❌ **REMOVER**

### 4. **TeamsScreen** 🗑️
- **Arquivo:** `TeamsScreen.tsx`
- **Função Original:** Tela antiga de criar/entrar em times (versão anterior)
- **Por que está obsoleta:**
  - Substituída por `TeamsMainScreen` e depois pelo fluxo de cabine
  - Não está mais registrada no `App.tsx`
- **Última Referência:** Nenhuma - arquivo órfão
- **Recomendação:** ❌ **REMOVER**

### 5. **BluetoothConnectionScreen** 🤔
- **Arquivo:** `BluetoothConnectionScreen.tsx`
- **Função Original:** Conectar ao dispositivo Bluetooth da cabine
- **Por que está obsoleta:**
  - No fluxo atual (modo mock), pulamos direto para `Lobby`
  - Conexão Bluetooth é gerenciada em background
- **Última Referência:** `App.tsx` (linha 201) - mas nunca navegada
- **Recomendação:** ⚠️ **MANTER PARA MODO REAL** (quando implementar conexão BLE real)

### 6. **ControlScreen** 🛠️
- **Arquivo:** `ControlScreen.tsx`
- **Função Original:** Debug - testar comandos Bluetooth manualmente
- **Por que não está no fluxo:**
  - É uma tela de **desenvolvimento/debug**
  - Não faz parte do fluxo do jogo
- **Recomendação:** ⚠️ **MANTER** (útil para testes de hardware)

### 7. **AppFull.tsx** 🗑️
- **Arquivo:** `AppFull.tsx` (não é uma tela, mas um app completo)
- **Função Original:** Versão original do app com fluxo antigo
- **Por que está obsoleto:**
  - Usa o fluxo antigo de times (TeamsMain, CreateTeam, BrowseTeams)
  - Não tem QRCodeScanner nem CabinLobby
  - Não suporta modo mock
- **Última Referência:** `index.ts` pode estar importando
- **Recomendação:** ❌ **REMOVER** (manter apenas `App.tsx`)

---

## 📋 Plano de Ação

### Fase 1: Remoção Imediata (Segura)
Telas e arquivos que podem ser removidos sem impacto:

```bash
# Remover telas completamente obsoletas
rm mobile/screens/TeamsMainScreen.tsx
rm mobile/screens/CreateTeamScreen.tsx
rm mobile/screens/BrowseTeamsScreen.tsx
rm mobile/screens/TeamsScreen.tsx

# Remover app antigo
rm mobile/AppFull.tsx
```

### Fase 2: Limpeza do App.tsx
Remover rotas não utilizadas:

```typescript
// REMOVER do App.tsx:
- Stack.Screen "TeamsMain"
- Stack.Screen "CreateTeam"
- Stack.Screen "BrowseTeams"
```

### Fase 3: Limpeza de Tipos
Remover tipos não utilizados de `RootStackParamList`:

```typescript
// REMOVER:
TeamsMain: undefined;
CreateTeam: undefined;
BrowseTeams: undefined;
```

### Fase 4: Decisão sobre BluetoothConnectionScreen
- ⚠️ Manter se planeja implementar conexão BLE real no futuro
- ❌ Remover se vai usar apenas modo mock

---

## 🎯 Fluxo Simplificado Após Limpeza

### Modo Mock (Atual)
```
BluetoothPermission (se necessário)
   ↓
QRCodeScanner → Mock Mode
   ↓
Login
   ↓
CabinLobby → Determina role
   ↓
Lobby → Time já criado
   ↓
Quiz
   ↓
Result
   ↓
PlayAgain → QRCodeScanner (reset)
```

### Modo Real (Futuro)
```
BluetoothPermission
   ↓
QRCodeScanner → Escanear QR real
   ↓
Login
   ↓
CabinLobby → WebSocket determina role
   ↓
BluetoothConnection (?) → Conectar ao ESP32
   ↓
Lobby
   ↓
Quiz
   ↓
Result
   ↓
PlayAgain
```

---

## 📊 Estatísticas de Limpeza

| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Total de Telas | 16 | 10-11 | 31-37% |
| Rotas no App.tsx | 14 | 10-11 | 21-28% |
| Arquivos de Código | 16 | 10-11 | 31-37% |
| Linhas de Código (aprox.) | ~2500 | ~1500 | 40% |

---

## ⚠️ Avisos Importantes

### Antes de Remover, Verifique:

1. **AppFull.tsx**: Existe um `AppFull.tsx` que pode estar usando as telas antigas
2. **Documentação**: Atualizar `README_STRUCTURE.md` e outros docs
3. **Testes**: Se houver testes automatizados, removê-los também
4. **Git**: Fazer commit antes de remover (para poder reverter se necessário)

### Comando de Backup Antes de Remover:

```bash
# Criar branch de backup
git checkout -b backup/before-screen-cleanup

# Fazer commit do estado atual
git add .
git commit -m "backup: estado antes de remover telas obsoletas"

# Voltar para branch principal
git checkout main
```

---

## 🔗 Arquivos Relacionados para Atualizar

Após remover as telas, atualizar:

1. **App.tsx** - Remover rotas
2. **AppFull.tsx** - Verificar e remover (se existir)
3. **README_STRUCTURE.md** - Atualizar lista de telas
4. **IMPLEMENTATION.md** - Atualizar fluxo
5. **docs/CABIN_ROOM_FLOW.md** - Confirmar que está atualizado

---

## 📝 Checklist de Remoção

```markdown
- [ ] Criar backup/branch
- [ ] Remover TeamsMainScreen.tsx
- [ ] Remover CreateTeamScreen.tsx
- [ ] Remover BrowseTeamsScreen.tsx
- [ ] Remover TeamsScreen.tsx
- [ ] Atualizar App.tsx (remover rotas)
- [ ] Atualizar RootStackParamList (remover tipos)
- [ ] Verificar AppFull.tsx
- [ ] Atualizar documentação
- [ ] Testar fluxo completo (mock)
- [ ] Commit das mudanças
- [ ] Validar que app compila sem erros
```

---

## 📞 Dúvidas?

**Não tenho certeza se devo remover X:**
- Se a tela **não aparece** no fluxo mock e você **não planeja usar** no modo real → REMOVA
- Se é uma tela de **debug/desenvolvimento** (ControlScreen) → MANTENHA
- Se **pode ser útil no futuro** (BluetoothConnectionScreen) → MANTENHA mas documente

**Como saber se uma tela é usada?**
```bash
# Buscar navegações para a tela
grep -r "navigate('NomeDaTela')" mobile/

# Se não aparecer nenhum resultado → provavelmente não é usada
```

---

*Auditoria realizada em: Janeiro 2026*  
*Próxima revisão sugerida: Após implementação de modo real*

