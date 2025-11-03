#!/bin/bash

# Script para apagar variáveis de ambiente redundantes do Vercel
# Mantém apenas: DATABASE_URL, JWT_SECRET, GOOGLE_API_KEY, NODE_ENV

echo "🔴 DELETANDO VARIÁVEIS REDUNDANTES DO VERCEL..."
echo ""

# Variáveis a deletar (as antigas/redundantes)
vars_to_delete=(
    "nexogeo_demo_POSTGRES_URL"
    "nexogeo_demo_POSTGRES_PRISMA_URL"
    "nexogeo_demo_DATABASE_URL_UNPOOLED"
    "nexogeo_demo_POSTGRES_URL_NON_POOLING"
    "nexogeo_demo_PGHOST"
    "nexogeo_demo_POSTGRES_USER"
    "nexogeo_demo_DATABASE_URL"
    "nexogeo_demo_POSTGRES_PASSWORD"
    "nexogeo_demo_POSTGRES_DATABASE"
    "nexogeo_demo_PGPASSWORD"
    "nexogeo_demo_PGDATABASE"
    "nexogeo_demo_PGHOST_UNPOOLED"
    "nexogeo_demo_PGUSER"
    "nexogeo_demo_POSTGRES_URL_NO_SSL"
    "nexogeo_demo_POSTGRES_HOST"
    "nexogeo_demo_NEON_PROJECT_ID"
    "DATABASE_URL2"
    "PORT"
    "POSTGRES_URL_NO_SSL"
    "POSTGRES_HOST"
    "NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY"
    "NEON_PROJECT_ID"
    "POSTGRES_PRISMA_URL"
    "DATABASE_URL_UNPOOLED"
    "POSTGRES_URL_NON_POOLING"
    "POSTGRES_USER"
    "STACK_SECRET_SERVER_KEY"
    "POSTGRES_PASSWORD"
    "POSTGRES_DATABASE"
    "PGHOST_UNPOOLED"
    "NEXT_PUBLIC_STACK_PROJECT_ID"
    "PGHOST"
    "PGUSER"
    "PGPASSWORD"
    "PGDATABASE"
    "POSTGRES_URL"
)

deleted_count=0

for var in "${vars_to_delete[@]}"; do
    echo "❌ Deletando: $var"
    vercel env rm "$var" --yes 2>/dev/null
    if [ $? -eq 0 ]; then
        deleted_count=$((deleted_count + 1))
    fi
done

echo ""
echo "✅ DELETADAS $deleted_count VARIÁVEIS"
echo ""
echo "📋 Variáveis MANTIDAS (essenciais):"
echo "  ✅ DATABASE_URL"
echo "  ✅ JWT_SECRET"
echo "  ✅ GOOGLE_API_KEY"
echo "  ✅ NODE_ENV"
echo ""
echo "🔍 Listando variáveis restantes..."
vercel env list
