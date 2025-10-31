// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock do Leaflet para testes
global.L = {
  Icon: {
    Default: {
      prototype: { _getIconUrl: jest.fn() },
      mergeOptions: jest.fn()
    }
  },
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn()
  })),
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  marker: jest.fn(() => ({ addTo: jest.fn() })),
  circle: jest.fn(() => ({ addTo: jest.fn() })),
  layerGroup: jest.fn(() => ({ 
    addLayer: jest.fn(),
    addTo: jest.fn() 
  })),
  latLngBounds: jest.fn(() => ({}))
};

// Mock do react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => <div data-testid="map-container" {...props}>{children}</div>,
  TileLayer: (props) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, ...props }) => <div data-testid="marker" {...props}>{children}</div>,
  Popup: ({ children, ...props }) => <div data-testid="popup" {...props}>{children}</div>,
  useMap: () => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn()
  })
}));