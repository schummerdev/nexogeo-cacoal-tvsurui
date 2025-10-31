import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, SkeletonLine, SkeletonCircle, useLoading } from './LoadingComponents';

describe('LoadingSpinner', () => {
  test('renderiza com tamanho padrão', () => {
    const { container } = render(<LoadingSpinner />);
    const spinnerRings = container.querySelectorAll('.spinner-ring');
    expect(spinnerRings).toHaveLength(3);
  });

  test('renderiza com tamanho large', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.firstChild;
    expect(spinner).toHaveStyle('width: 48px');
    expect(spinner).toHaveStyle('height: 48px');
  });

  test('renderiza em fullScreen', () => {
    render(<LoadingSpinner fullScreen />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  test('renderiza com cor success', () => {
    const { container } = render(<LoadingSpinner color="success" />);
    const spinnerRings = container.querySelectorAll('.spinner-ring');
    expect(spinnerRings).toHaveLength(3);
  });
});

describe('SkeletonLine', () => {
  test('renderiza com largura padrão', () => {
    const { container } = render(<SkeletonLine />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveStyle('width: 100%');
    expect(skeleton).toHaveStyle('height: 1rem');
  });

  test('renderiza com dimensões customizadas', () => {
    const { container } = render(<SkeletonLine width="50%" height="2rem" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveStyle('width: 50%');
    expect(skeleton).toHaveStyle('height: 2rem');
  });
});

describe('SkeletonCircle', () => {
  test('renderiza com tamanho padrão', () => {
    const { container } = render(<SkeletonCircle />);
    const circle = container.firstChild;
    expect(circle).toHaveStyle('width: 3rem');
    expect(circle).toHaveStyle('height: 3rem');
    expect(circle).toHaveStyle('border-radius: 50%');
  });
});

describe('useLoading hook', () => {
  const TestComponent = () => {
    const { isLoading, startLoading, stopLoading } = useLoading();
    
    return (
      <div>
        <span data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</span>
        <button data-testid="start-loading" onClick={startLoading}>Start</button>
        <button data-testid="stop-loading" onClick={stopLoading}>Stop</button>
      </div>
    );
  };

  test('inicia com estado idle', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
  });
});