# Sistema de Migrações de Banco de Dados

Este projeto utiliza `node-pg-migrate` para gerenciar as migrações do banco de dados PostgreSQL.

## Estrutura de Migrações

As migrações são armazenadas no diretório `backend/migrations/` e seguem o padrão de nomenclatura:
`{timestamp}_{descricao}.js`

## Comandos Disponíveis

### Executar todas as migrações pendentes
```bash
cd backend
npm run migrate-up
```

### Reverter a última migração
```bash
cd backend
npm run migrate-down
```

### Criar uma nova migração
```bash
cd backend
npm run migrate create nome-da-migracao
```

## Migração Inicial

A migração inicial (`1620000000000_create-initial-schema.js`) cria todas as tabelas necessárias para o funcionamento do sistema:

- emissoras
- usuarios_admin
- promocoes
- participantes
- ganhadores

Também cria os índices necessários para otimização das consultas.

## Configuração

O sistema de migrações utiliza as mesmas variáveis de ambiente definidas para a conexão do banco de dados:

- `DB_USER`
- `DB_HOST`
- `DB_DATABASE`
- `DB_PASSWORD`
- `DB_PORT`

Para ambientes de produção, também pode ser utilizada a variável `DATABASE_URL`.