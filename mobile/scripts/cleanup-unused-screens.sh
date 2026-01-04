#!/bin/bash

# Script para remover telas obsoletas do RodaRico
# Uso: bash scripts/cleanup-unused-screens.sh

set -e  # Para o script se houver erro

echo "🧹 Iniciando limpeza de telas obsoletas..."
echo ""

# Cores para output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -f "App.tsx" ]; then
    echo "${RED}❌ Erro: Execute este script do diretório mobile/${NC}"
    exit 1
fi

# Criar backup
echo "${YELLOW}📦 Criando backup...${NC}"
git checkout -b backup/before-screen-cleanup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || echo "Branch de backup já existe ou erro ao criar"
git add -A
git commit -m "backup: estado antes de remover telas obsoletas" 2>/dev/null || echo "Nada para commitar"

# Remover telas obsoletas
echo ""
echo "${YELLOW}🗑️  Removendo telas obsoletas...${NC}"

FILES_TO_REMOVE=(
    "screens/TeamsMainScreen.tsx"
    "screens/CreateTeamScreen.tsx"
    "screens/BrowseTeamsScreen.tsx"
    "screens/TeamsScreen.tsx"
    "AppFull.tsx"
)

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ Removendo: $file"
        rm "$file"
    else
        echo "  ⚠️  Não encontrado: $file"
    fi
done

echo ""
echo "${GREEN}✅ Telas removidas com sucesso!${NC}"
echo ""
echo "${YELLOW}⚠️  Próximos passos manuais:${NC}"
echo "  1. Abra App.tsx e remova as seguintes rotas:"
echo "     - Stack.Screen name=\"TeamsMain\""
echo "     - Stack.Screen name=\"CreateTeam\""
echo "     - Stack.Screen name=\"BrowseTeams\""
echo ""
echo "  2. Remova os tipos de RootStackParamList:"
echo "     - TeamsMain: undefined;"
echo "     - CreateTeam: undefined;"
echo "     - BrowseTeams: undefined;"
echo ""
echo "  3. Teste o app:"
echo "     npm start"
echo ""
echo "  4. Se tudo funcionar, faça commit:"
echo "     git add ."
echo "     git commit -m \"cleanup: remove telas obsoletas do fluxo antigo\""
echo ""
echo "${GREEN}✨ Limpeza concluída!${NC}"

