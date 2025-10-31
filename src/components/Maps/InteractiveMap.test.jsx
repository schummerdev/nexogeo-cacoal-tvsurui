import React from 'react';
import { render, screen } from '@testing-library/react';
import InteractiveMap from './InteractiveMap';

// Mock do react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, ...props }) => (
    <div data-testid="marker" {...props}>
      {children}
    </div>
  ),
  Popup: ({ children, ...props }) => (
    <div data-testid="popup" {...props}>
      {children}
    </div>
  ),
  useMap: () => ({
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
    setView: jest.fn()
  })
}));

// Mock do Leaflet
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn()
    }
  },
  circle: jest.fn(() => ({
    addTo: jest.fn()
  })),
  layerGroup: jest.fn(() => ({
    addLayer: jest.fn(),
    addTo: jest.fn(),
    removeLayer: jest.fn()
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn()
  })),
  latLngBounds: jest.fn(() => ({
    isValid: () => true,
    getNorthEast: () => ({ lat: 0, lng: 0 }),
    getSouthWest: () => ({ lat: 0, lng: 0 }),
    getCenter: () => ({ lat: 0, lng: 0 })
  }))
}));

describe('InteractiveMap', () => {
  const defaultProps = {
    participants: [],
    center: [-23.5505, -46.6333],
    zoom: 10,
    showHeatmap: false,
    height: '400px'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderização básica', () => {
    test('deve renderizar o mapa corretamente', () => {
      render(<InteractiveMap {...defaultProps} />);
      
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    });

    test('deve aceitar altura customizada', () => {
      const customHeight = '600px';
      render(<InteractiveMap {...defaultProps} height={customHeight} />);
      
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    });

    test('deve aceitar centro e zoom customizados', () => {
      const customCenter = [-22.9068, -43.1729];
      const customZoom = 15;
      
      render(
        <InteractiveMap 
          {...defaultProps} 
          center={customCenter} 
          zoom={customZoom} 
        />
      );
      
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    });
  });

  describe('Marcadores de participantes', () => {
    const mockParticipants = [
      {
        id: 1,
        name: 'João Silva',
        lat: -23.5505,
        lng: -46.6333,
        city: 'São Paulo',
        district: 'Centro'
      },
      {
        id: 2,
        name: 'Maria Santos',
        lat: -22.9068,
        lng: -43.1729,
        city: 'Rio de Janeiro',
        district: 'Centro'
      }
    ];

    test('deve renderizar marcadores para participantes', () => {
      render(
        <InteractiveMap 
          {...defaultProps} 
          participants={mockParticipants}
        />
      );
      
      const markers = screen.getAllByTestId('marker');
      expect(markers.length).toBeGreaterThan(0);
    });

    test('deve exibir informações nos popups', () => {
      render(
        <InteractiveMap 
          {...defaultProps} 
          participants={mockParticipants}
        />
      );
      
      const popups = screen.getAllByTestId('popup');
      expect(popups.length).toBeGreaterThan(0);
    });
  });

  describe('Funcionalidade de heatmap', () => {
    test('deve renderizar mapa normalmente sem heatmap', () => {
      render(
        <InteractiveMap 
          {...defaultProps} 
          showHeatmap={false}
        />
      );
      
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('Casos extremos', () => {
    test('deve funcionar com props undefined', () => {
      expect(() => {
        render(
          <InteractiveMap 
            participants={undefined}
            center={undefined}
            zoom={undefined}
          />
        );
      }).not.toThrow();
    });

    test('deve funcionar sem participantes', () => {
      render(
        <InteractiveMap 
          {...defaultProps} 
          participants={[]}
        />
      );
      
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });
});