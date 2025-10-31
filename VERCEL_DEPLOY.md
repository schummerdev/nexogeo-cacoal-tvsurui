# Instruções para Implantação na Vercel

## Configuração do Projeto

O projeto está configurado para ser implantado na Vercel com as seguintes características:

1. **Frontend**: Aplicativo React criado com Create React App
2. **Backend**: API Node.js com Express
3. **Banco de Dados**: SQLite para desenvolvimento, PostgreSQL para produção

## Arquivo de Configuração

O arquivo `vercel.json` na raiz do projeto configura:

- Build do frontend usando `@vercel/static-build`
- Execução do backend como função serverless usando `@vercel/node`
- Rotas para direcionar chamadas da API para o backend

## Variáveis de Ambiente

Para a implantação na Vercel, você precisará configurar as seguintes variáveis de ambiente:

```
# Configurações do Banco de Dados PostgreSQL
DB_USER=seu_usuario_db
DB_HOST=seu_host_db
DB_DATABASE=seu_nome_db
DB_PASSWORD=sua_senha_db
DB_PORT=5432

# Chave Secreta para JWT
JWT_SECRET=sua_chave_secreta_jwt_aqui

# Outras configurações
NODE_ENV=production
```

Você pode configurar essas variáveis no painel da Vercel em:
Settings → Environment Variables

## Banco de Dados

Para implantação em produção, o sistema usa PostgreSQL atravez de migrations

## Considerações Importantes

1. O frontend foi configurado para usar URLs relativas (`/api/...`) em vez de URLs absolutas
2. O backend está configurado para funcionar como função serverless na Vercel
3. O sistema usa SQLite para desenvolvimento e PostgreSQL para produção

## Implantação

1. Conecte o repositório ao seu projeto na Vercel
2. Configure as variáveis de ambiente
3. Faça o deploy automático via git push ou manualmente pelo painel da Vercel