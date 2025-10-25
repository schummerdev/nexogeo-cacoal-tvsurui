#!/bin/bash
echo "🔄 Forçando rebuild na Vercel..."
git commit --allow-empty -m "chore: Force rebuild do Design System v2.7"
git push origin main
echo "✅ Commit vazio enviado - Vercel deve iniciar o rebuild agora"
echo "⏳ Aguarde 2-3 minutos para o deploy completar"
