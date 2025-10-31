# 🧪 Documentação de Testes - NexoGeo v2

## Visão Geral

Este projeto possui uma suíte abrangente de testes automatizados utilizando **Jest** e **React Testing Library**, garantindo qualidade e confiabilidade do código.

## Estatísticas de Cobertura

### Resumo Atual:
- **Cobertura Total**: ~26.22% (melhorada significativamente)
- **Componentes Críticos**: 100% de cobertura
- **Serviços**: 81.97% de cobertura
- **Total de Testes**: 97+ testes implementados

### Componentes com 100% de Cobertura:
- ✅ **LoginForm**: 15 testes
- ✅ **ThemeSelector**: 29 testes  
- ✅ **Header**: 23 testes
- ✅ **Toast**: 29 testes
- ✅ **ThemeContext**: 17 testes
- ✅ **ToastContext**: 16 testes

### Páginas Testadas:
- ✅ **DashboardHomePage**: 16 testes (63.52% de cobertura)

### Serviços Testados:
- ✅ **authService**: 100% de cobertura
- ✅ **dashboardService**: 100% de cobertura
- ✅ **participanteService**: 96.96% de cobertura
- ✅ **promocaoService**: 87.5% de cobertura
- ✅ **sorteioService**: 82.14% de cobertura

## Estrutura de Testes

### 1. Testes de Componentes

#### LoginForm (`src/components/LoginForm/LoginForm.test.jsx`)
```javascript
// Principais cenários testados:
- Renderização inicial
- Validação de campos obrigatórios
- Estados de loading
- Tratamento de erros
- Redirecionamento após login
- Acessibilidade
- Casos extremos
```

#### ThemeSelector (`src/components/ThemeSelector/ThemeSelector.test.jsx`)
```javascript
// Principais cenários testados:
- Modo dropdown vs inline
- Troca de temas
- Estados visuais
- Acessibilidade
- Props dinâmicas
- Casos extremos (temas vazios, etc.)
```

#### Header (`src/components/DashboardLayout/Header.test.jsx`)
```javascript
// Principais cenários testados:
- Renderização de título/subtítulo
- Informações do usuário
- Funcionalidade de logout
- Integração com ThemeSelector
- Casos extremos
```

#### Sidebar (`src/components/DashboardLayout/Sidebar.test.jsx`)
```javascript
// Principais cenários testados:
- Links de navegação
- Seletor de temas integrado
- Layout responsivo
- Acessibilidade
- Estados visuais
```

### 2. Testes de Contextos

#### ThemeContext (`src/contexts/ThemeContext.test.jsx`)
```javascript
// Principais cenários testados:
- Mudança de temas
- Persistência no localStorage
- Hook useTheme
- Estados iniciais
- Erro boundaries
```

#### ToastContext (`src/contexts/ToastContext.test.jsx`)
```javascript
// Principais cenários testados:
- Adição de toasts
- Remoção automática
- Múltiplos toasts
- Tipos diferentes
- Timers e cleanup
```

### 3. Testes de Páginas

#### DashboardHomePage (`src/pages/DashboardHomePage.test.jsx`)
```javascript
// Principais cenários testados:
- Carregamento inicial
- Exibição de dados
- Gráficos e mapas
- Tratamento de erros
- Autenticação
- Ações rápidas
```

### 4. Testes de Serviços

#### authService (`src/services/authService.test.js`)
```javascript
// Principais cenários testados:
- Login com credenciais válidas/inválidas
- Verificação de token
- Logout
- Tratamento de erros de rede
- Parsing de resposta
```

#### dashboardService (`src/services/dashboardService.test.js`)
```javascript
// Principais cenários testados:
- Busca de dados do dashboard
- Tratamento de token expirado
- Filtros opcionais
- Dados vazios
- Erros de rede
```

## Comandos de Teste

### Executar Todos os Testes
```bash
npm test
```

### Executar com Cobertura
```bash
npm test -- --coverage
```

### Executar Testes Específicos
```bash
# Por arquivo
npm test -- LoginForm.test.jsx

# Por padrão
npm test -- --testPathPattern="ThemeSelector"

# Por describe
npm test -- --testNamePattern="deve renderizar"
```

### Modo Watch (Desenvolvimento)
```bash
npm test -- --watch
```

### Executar Silenciosamente
```bash
npm test -- --silent
```

## Estratégias de Teste Utilizadas

### 1. **Arrange-Act-Assert (AAA)**
```javascript
test('deve fazer login com credenciais válidas', async () => {
  // Arrange
  const credentials = { usuario: 'test', senha: 'password' };
  
  // Act
  const result = await login(credentials);
  
  // Assert
  expect(result.success).toBe(true);
});
```

### 2. **Mocking Estratégico**
```javascript
// Mock de serviços externos
jest.mock('../services/authService');

// Mock de componentes filhos
jest.mock('../components/ThemeSelector/ThemeSelector', () => {
  return function MockThemeSelector() {
    return <div data-testid="theme-selector">Mock</div>;
  };
});
```

### 3. **Testes de Integração**
```javascript
// Testes que verificam integração entre componentes
const renderWithProviders = (component) => {
  return render(
    <ThemeProvider>
      <ToastProvider>
        {component}
      </ToastProvider>
    </ThemeProvider>
  );
};
```

### 4. **Testes de Acessibilidade**
```javascript
test('deve ser acessível por teclado', () => {
  render(<LoginForm />);
  
  const input = screen.getByLabelText('Usuário');
  expect(input).toHaveAttribute('aria-required', 'true');
});
```

### 5. **Testes de Casos Extremos**
```javascript
test('deve lidar com dados malformados', async () => {
  mockFetch.mockResolvedValue({ json: () => null });
  
  await expect(fetchData()).rejects.toThrow();
});
```

## Boas Práticas Implementadas

### ✅ **O que fazemos bem:**

1. **Cobertura Abrangente**: Testamos componentes críticos completamente
2. **Mocks Inteligentes**: Isolamos dependências adequadamente
3. **Testes de Interação**: Simulamos ações reais do usuário
4. **Casos Extremos**: Cobrimos cenários de erro e edge cases
5. **Acessibilidade**: Incluímos testes a11y nos componentes
6. **Cleanup**: Limpamos mocks e estados entre testes

### 📋 **Padrões Seguidos:**

- Nomenclatura descritiva em português brasileiro
- Organização por describe blocks
- Setup e teardown adequados
- Asserts específicos e claros
- Timeouts apropriados para operações assíncronas

## Próximos Passos

### 🎯 **Melhorias Planejadas:**

1. **Aumentar Cobertura**: Atingir 80%+ de cobertura geral
2. **Testes E2E**: Implementar testes end-to-end com Cypress/Playwright
3. **Testes de Performance**: Adicionar testes de performance para componentes críticos
4. **Visual Regression**: Implementar testes de regressão visual
5. **CI/CD Integration**: Configurar pipeline de testes contínuos

### 📊 **Métricas a Monitorar:**

- Tempo de execução dos testes
- Cobertura de código
- Flakiness dos testes
- Taxa de falsos positivos/negativos

## Troubleshooting

### Problemas Comuns:

#### 1. **Testes Assíncronos**
```javascript
// ❌ Errado
test('async test', () => {
  fetchData(); // Sem await
});

// ✅ Correto
test('async test', async () => {
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument();
  });
});
```

#### 2. **Cleanup de Mocks**
```javascript
beforeEach(() => {
  jest.clearAllMocks(); // Limpa mocks entre testes
});
```

#### 3. **Timers em Testes**
```javascript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
```

## Conclusão

O sistema de testes do NexoGeo v2 garante:
- ✅ Confiabilidade do código em produção
- ✅ Facilita refatoração segura
- ✅ Documenta comportamento esperado
- ✅ Detecta regressões rapidamente
- ✅ Melhora qualidade geral do projeto

Para contribuir com novos testes, siga os padrões estabelecidos e mantenha a cobertura alta nos componentes críticos.