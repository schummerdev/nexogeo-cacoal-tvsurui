#!/bin/bash
echo "🔴 DELETANDO VARIÁVEIS COM PREFIXO tvsurui_..."

vars_to_delete=(
    "tvsurui_DATABASE_URL_UNPOOLED"
    "tvsurui_POSTGRES_URL_NON_POOLING"
    "tvsurui_PGHOST"
    "tvsurui_POSTGRES_USER"
    "tvsurui_STACK_SECRET_SERVER_KEY"
    "tvsurui_DATABASE_URL"
    "tvsurui_POSTGRES_PASSWORD"
    "tvsurui_POSTGRES_DATABASE"
    "tvsurui_PGPASSWORD"
    "tvsurui_PGDATABASE"
    "tvsurui_PGHOST_UNPOOLED"
    "tvsurui_PGUSER"
    "tvsurui_POSTGRES_URL_NO_SSL"
    "tvsurui_POSTGRES_HOST"
    "tvsurui_NEON_PROJECT_ID"
    "tvsurui_POSTGRES_URL"
    "tvsurui_POSTGRES_PRISMA_URL"
    "NEXT_PUBLIC_tvsurui_STACK_PROJECT_ID"
    "NEXT_PUBLIC_tvsurui_STACK_PUBLISHABLE_CLIENT_KEY"
)

for var in "${vars_to_delete[@]}"; do
    echo "❌ Deletando: $var"
    vercel env rm "$var" --yes 2>/dev/null || echo "   (já foi deletada)"
done

echo ""
echo "✅ DELETADAS VARIÁVEIS REDUNDANTES"
echo ""
echo "📋 Listando variáveis restantes..."
vercel env list
