# Design System NexoGeo v2.7

## 🎨 Upgrade Visual - Efeitos e Cores Aprimoradas

Este documento detalha o novo sistema de design implementado na v2.7, mantendo compatibilidade com os temas existentes (claro/escuro).

---

## 📋 Índice

1. [Paleta de Cores](#paleta-de-cores)
2. [Design Tokens](#design-tokens)
3. [Efeitos Visuais](#efeitos-visuais)
4. [Animações](#animações)
5. [Componentes](#componentes)
6. [Tema Escuro](#tema-escuro)
7. [Acessibilidade](#acessibilidade)
8. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎨 Paleta de Cores

### Tema Claro (Padrão)

```css
/* Cores Principais */
--color-primary: #3b82f6      /* Azul */
--color-primary-dark: #2563eb /* Azul Escuro */
--color-primary-light: #60a5fa /* Azul Claro */
--color-secondary: #e2e8f0    /* Cinza Claro */
--color-background: #f8fafc   /* Fundo Branco */
--color-surface: #ffffff      /* Superfície Branca */
--color-text: #1e293b         /* Texto Escuro */
--color-text-secondary: #64748b /* Texto Cinza */
--color-border: #e2e8f0       /* Borda Cinza */
--color-success: #10b981      /* Verde */
--color-warning: #f59e0b      /* Amarelo */
--color-danger: #ef4444       /* Vermelho */
--color-info: #06b6d4         /* Ciano */

/* Cores Complementares (Paleta Extendida) */
--color-purple: #8b5cf6       /* Roxo */
--color-pink: #ec4899         /* Rosa */
--color-indigo: #6366f1       /* Índigo */
--color-cyan: #06b6d4         /* Ciano */
--color-teal: #14b8a6         /* Teal */
--color-lime: #84cc16         /* Lima */
```

### Tema Escuro (Automático)

Quando `prefers-color-scheme: dark`:

```css
--color-primary: #60a5fa       /* Azul Claro */
--color-background: #0f172a    /* Fundo Escuro */
--color-surface: #1e293b       /* Superfície Cinza Escuro */
--color-text: #f1f5f9          /* Texto Branco */
--color-text-secondary: #cbd5e1 /* Texto Cinza Claro */
--color-border: #334155        /* Borda Cinza Escuro */
```

---

## 🎯 Design Tokens

### Gradientes

```css
/* Gradientes Modernos */
--gradient-primary: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
--gradient-primary-soft: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
--gradient-cosmic: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
--gradient-ocean: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
--gradient-forest: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
--gradient-sunset: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
--gradient-vibrant: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%);
--gradient-neon: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
--gradient-dark-purple: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%);
```

### Sombras

```css
/* Sombras Suaves */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Sombras Médias */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Sombras Pesadas */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
--shadow-elevated: 0 15px 35px rgba(0, 0, 0, 0.12);

/* Sombras com Brilho */
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
--shadow-glow: 0 0 20px rgba(59, 130, 246, 0.3);
--shadow-glow-primary: 0 0 25px rgba(59, 130, 246, 0.4);
--shadow-glow-purple: 0 0 25px rgba(139, 92, 246, 0.4);
--shadow-glow-pink: 0 0 25px rgba(236, 72, 153, 0.4);
```

### Transições

```css
--transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
--transition-smooth: 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
--transition-bounce: 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Blur e Border Radius

```css
/* Backdrop Blur */
--backdrop-blur-xs: blur(2px);
--backdrop-blur-sm: blur(4px);
--backdrop-blur-md: blur(8px);
--backdrop-blur-lg: blur(16px);
--backdrop-blur-xl: blur(24px);

/* Border Radius */
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 20px;
--radius-full: 9999px;
```

---

## ✨ Efeitos Visuais

### 1. Gradient Border (Borda com Gradiente)

```html
<div class="gradient-border">
  Conteúdo com borda gradiente
</div>
```

**Efeito:** Borda vibrante com gradiente que envolve o elemento.

### 2. Floating Animation (Flutuação)

```html
<div class="float">Flutuante</div>
<div class="float-slow">Flutuação Lenta</div>
```

**Efeito:** Elemento flutua suavemente, como se estivesse flutuando no ar.
- `.float`: 3s de duração
- `.float-slow`: 4s de duração

### 3. Pulse Glow (Pulso de Luminosidade)

```html
<div class="pulse-glow">Pulsante</div>
```

**Efeito:** Sombra pulsante que ativa/desativa continuamente.

### 4. Shimmer Effect (Efeito Brilho)

```html
<div class="shimmer"></div>
```

**Efeito:** Animação de carregamento com brilho deslizante (skeleton loading).

### 5. Glow Border (Borda Luminosa)

```html
<div class="glow-border">Borda com Glow</div>
```

**Efeito:** Borda que brilha ao passar o mouse.

### 6. Neon Text (Texto Neon)

```html
<h1 class="neon">Texto Neon</h1>
```

**Efeito:** Texto com brilho neon piscante (como letreiros).

### 7. Blur Background (Fundo Desfocado)

```html
<div class="blur-bg">Glassmorphism Light</div>
<div class="blur-bg-dark">Glassmorphism Dark</div>
```

**Efeito:** Fundo com efeito de vidro (glassmorphism).

---

## 🎬 Animações

### Slide In (Entrada Lateral)

```html
<div class="slide-in-left">Entra pela esquerda</div>
<div class="slide-in-right">Entra pela direita</div>
```

### Bounce In (Entrada com Salto)

```html
<div class="bounce-in">Entra com salto</div>
```

### Color Shift (Rotação de Cores)

```html
<div class="color-shift">Cores rotacionam</div>
```

### Ripple Effect (Ondulação)

```html
<button class="btn ripple">Clique para ripple</button>
```

---

## 🎨 Componentes

### Botões Aprimorados

```html
<!-- Botão com Gradiente e Brilho -->
<button class="btn btn-gradient">Botão Gradiente</button>

<!-- Botão com Estados -->
<button class="btn btn-primary">Primário</button>
<button class="btn btn-secondary">Secundário</button>
```

### Ícones com Efeitos

```html
<!-- Rotação ao hover -->
<i class="icon-rotate">⚙️</i>

<!-- Escala ao hover -->
<i class="icon-scale">✨</i>

<!-- Salto ao hover -->
<i class="icon-bounce">🎯</i>
```

### Cards Modernos

```html
<!-- Card Moderno -->
<div class="card-modern">
  Conteúdo
</div>

<!-- Card com Vidro -->
<div class="card-glass">
  Conteúdo com glassmorphism
</div>

<!-- Card Flutuante com Brilho -->
<div class="card float pulse-glow">
  Flutuante e Pulsante
</div>
```

### Texto com Efeitos

```html
<!-- Gradiente de Cor -->
<h1 class="text-gradient">Título com Gradiente</h1>

<!-- Sombra -->
<p class="text-shadow">Texto com Sombra</p>
<p class="text-shadow-lg">Texto com Sombra Grande</p>

<!-- Link com Sublinha Animada -->
<a href="#" class="underline-hover">Link Especial</a>
```

### Estados Visuais

```html
<!-- Estado de Carregamento -->
<div class="loading-card">Carregando...</div>

<!-- Estado de Sucesso -->
<div class="success-state">Operação bem-sucedida!</div>

<!-- Estado de Erro -->
<div class="error-state">Erro na operação</div>

<!-- Estado de Aviso -->
<div class="warning-state">Atenção necessária</div>
```

---

## 🌙 Tema Escuro

O tema escuro é automaticamente ativado quando o usuário preferir:

```css
@media (prefers-color-scheme: dark) {
  /* Cores otimizadas para dark mode */
  /* Gradientes ajustados */
  /* Contraste melhorado */
}
```

### Diferenças Tema Escuro:

| Elemento | Tema Claro | Tema Escuro |
|----------|-----------|-----------|
| Background | #f8fafc | #0f172a |
| Surface | #ffffff | #1e293b |
| Text | #1e293b | #f1f5f9 |
| Primary | #3b82f6 | #60a5fa |
| Border | #e2e8f0 | #334155 |

---

## ♿ Acessibilidade

### Suporte a Preferências do Usuário

```css
/* Reduz animações para usuários que as preferem reduzidas */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Hover apenas em dispositivos que suportam */
@media (hover: hover) {
  .btn:hover { ... }
}

/* Estados ativos para dispositivos touch */
@media (hover: none) {
  .btn:active { ... }
}
```

### Foco Acessível

```css
.btn:focus,
.form-input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

---

## 📚 Exemplos de Uso

### Exemplo 1: Card Moderno e Flutuante

```html
<div class="card-modern float pulse-glow">
  <h2 class="text-gradient">Título Especial</h2>
  <p class="text-shadow">Descrição com efeito</p>
  <button class="btn btn-gradient">Ação</button>
</div>
```

### Exemplo 2: Seção com Glassmorphism

```html
<div class="blur-bg card-glass">
  <h1 class="neon slide-in-left">Bem-vindo</h1>
  <p>Conteúdo com glassmorphism</p>
</div>
```

### Exemplo 3: Formulário Interativo

```html
<form>
  <div class="form-group">
    <label class="form-label">Nome</label>
    <input type="text" class="form-input glow-border" />
  </div>
  <button class="btn btn-primary">
    <i class="icon-scale">✓</i> Enviar
  </button>
</form>
```

### Exemplo 4: Hero Section

```html
<section class="blur-bg" style="background: var(--gradient-vibrant);">
  <h1 class="text-gradient neon bounce-in">
    NexoGeo Pro
  </h1>
  <p class="slide-in-right">
    Geolocalização Inteligente
  </p>
  <button class="btn btn-gradient float">
    Começar Agora
  </button>
</section>
```

---

## 🚀 Como Usar

### 1. Aplicar Efeito Simples

```html
<div class="card float">Flutuante</div>
```

### 2. Combinar Efeitos

```html
<div class="card-modern float pulse-glow">
  Flutuante com brilho
</div>
```

### 3. Usar com Tema

```html
<div class="gradient-border blur-bg">
  Adapta-se automaticamente ao tema
</div>
```

---

## 📊 Performance

✅ **CSS-only**: Sem JavaScript necessário
✅ **GPU Accelerated**: Transform e opacity
✅ **Responsive**: Funciona em todos os tamanhos
✅ **Lightweight**: Apenas ~15KB adicional
✅ **No Breaking Changes**: Compatível com v2.6

---

## 🔄 Compatibilidade

| Navegador | Suporte |
|-----------|---------|
| Chrome 90+ | ✅ Completo |
| Firefox 88+ | ✅ Completo |
| Safari 14+ | ✅ Completo |
| Edge 90+ | ✅ Completo |
| Mobile Browsers | ✅ Completo |

---

## 📝 Notas

- Todos os efeitos são opcionais e não afetam a funcionalidade
- As transições respeitam as preferências de acessibilidade
- O tema escuro é automático (sem necessidade de código adicional)
- Classes podem ser combinadas para efeitos complexos

---

## 📞 Suporte

Para dúvidas sobre o novo design system:
1. Consulte `src/index.css` (linhas 674+)
2. Veja exemplos em `src/pages/`
3. Teste no browser com DevTools

---

**Versão:** 2.7 Enhanced
**Data:** Oct 25, 2025
**Mantido por:** Claude Code + NexoGeo Team
