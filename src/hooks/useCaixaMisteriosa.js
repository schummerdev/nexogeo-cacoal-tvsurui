import { useState, useEffect, useCallback } from 'react';
import { getCurrentToken } from '../services/authService';
import caixaMisteriosaStore from '../store/caixaMisteriosaStore';

// Hook customizado para gerenciar todo o estado e lógica do Caixa Misteriosa

const API_BASE_URL = '/api/caixa-misteriosa'; // Base para todas as chamadas da nossa API

export function useCaixaMisteriosa() {
    // Estado do hook sincronizado com o store externo
    const [state, setState] = useState(() => caixaMisteriosaStore.getState());
    const [sponsors, setSponsors] = useState([]); // Armazena a lista de patrocinadores
    const [products, setProducts] = useState([]); // Armazena a lista de produtos de um patrocinador

    console.log('🎣 Hook useCaixaMisteriosa renderizado - State:', state.loading, state.liveGame ? 'DADOS' : 'SEM DADOS');

    // Função genérica para fazer chamadas fetch e tratar erros (para sponsors/products)
    const apiFetch = useCallback(async (url, options = {}) => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };

            // Rotas públicas - NÃO precisam de autenticação
            const publicRoutes = ['/game/live', '/game/submit', '/register', '/submissions', '/last-finished'];
            const isPublicRoute = publicRoutes.some(route => url.startsWith(route));

            console.log('🔐 [apiFetch DEBUG] URL:', url, 'isPublicRoute:', isPublicRoute);

            // Adiciona token apenas para endpoints protegidos (rotas não públicas)
            if (!isPublicRoute) {
                const token = getCurrentToken();
                console.log('🔐 [apiFetch DEBUG] Token obtido:', token ? `${token.substring(0, 20)}...` : 'NULL');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                    console.log('✅ [apiFetch DEBUG] Header Authorization adicionado');
                } else {
                    console.error('❌ [apiFetch DEBUG] Token não encontrado no localStorage!');
                }
            } else {
                console.log('🌐 [apiFetch DEBUG] Rota pública - sem autenticação');
            }

            console.log('🔐 [apiFetch DEBUG] Headers finais:', Object.keys(headers));
            const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ocorreu um erro na requisição.');
            }

            // Retorna o JSON apenas se a resposta não for "No Content"
            if (response.status === 204) {
                return null;
            }
            return await response.json();

        } catch (e) {
            console.error('API Fetch Error:', e);
            console.error('Erro completo:', {
                message: e.message,
                stack: e.stack,
                name: e.name
            });
            throw e; // Re-lança erro para ser tratado pelo componente
        }
    }, []);

    // --- Funções de Carregamento de Dados ---

    const fetchSponsors = useCallback(async () => {
        try {
            const sponsorData = await apiFetch('/sponsors');
            if (sponsorData && Array.isArray(sponsorData)) {
                setSponsors(sponsorData);
                return sponsorData;
            } else {
                console.log('🏢 fetchSponsors: Nenhum patrocinador encontrado no banco');
                setSponsors([]);
                return [];
            }
        } catch (error) {
            console.error('🏢 fetchSponsors Error:', error);
            setSponsors([]);
            return [];
        }
    }, [apiFetch]);

    const fetchProductsBySponsor = useCallback(async (sponsorId) => {
        if (!sponsorId) return [];
        try {
            const productData = await apiFetch(`/sponsors/${sponsorId}/products`);
            if (productData && Array.isArray(productData)) {
                setProducts(productData);
                return productData;
            } else {
                console.log('📦 fetchProductsBySponsor: Nenhum produto encontrado no banco');
                setProducts([]);
                return [];
            }
        } catch (error) {
            console.error('📦 fetchProductsBySponsor Error:', error);
            setProducts([]);
            return [];
        }
    }, [apiFetch]);

    // Efeito para se inscrever no store e fazer fetch inicial
    useEffect(() => {
        console.log('🔌 Inscrevendo no store');

        const unsubscribe = caixaMisteriosaStore.subscribe((newState) => {
            console.log('📢 Store notificou mudança:', newState);
            setState(newState);
        });

        if (!caixaMisteriosaStore.initialized) {
            console.log('🚀 Fazendo fetch inicial via store (cache:', !!caixaMisteriosaStore.data, ')');
            caixaMisteriosaStore.fetchLiveGame();
            caixaMisteriosaStore.fetchLastFinishedGame(); // Chamar a nova função
        }

        return () => {
            console.log('🔌 Desinscrevendo do store');
            unsubscribe();
        };
    }, []);

    // --- Funções de Ação (Chamadas pela UI) ---

    const submitGuess = async (guessData) => {
        return await apiFetch('/game/submit', { method: 'POST', body: JSON.stringify(guessData) });
    };

    const startGame = async (productId) => {
        const result = await apiFetch('/game/start', { method: 'POST', body: JSON.stringify({ productId }) });
        if (result) {
            console.log('🎮 startGame: Fazendo refetch via store');
            caixaMisteriosaStore.refetchLiveGame();
        }
        return result;
    };

    const revealClue = async () => {
        const result = await apiFetch('/game/reveal-clue', { method: 'POST' });
        if (result) {
            console.log('🔍 revealClue: Fazendo refetch via store');
            caixaMisteriosaStore.refetchLiveGame();
        }
        return result;
    };

    const endSubmissions = async () => {
        const result = await apiFetch('/game/end-submissions', { method: 'POST' });
        if (result) {
            console.log('⏹️ endSubmissions: Fazendo refetch via store');
            caixaMisteriosaStore.refetchLiveGame();
        }
        return result;
    };

    const drawWinner = async () => {
        const result = await apiFetch('/game/draw-winner', { method: 'POST' });
        if (result) {
            console.log('🏆 drawWinner: Fazendo refetch via store');
            caixaMisteriosaStore.refetchLiveGame();
        }
        return result;
    };

    const resetGame = async () => {
        const result = await apiFetch('/game/reset', { method: 'POST' });
        if (result) {
            console.log('🔄 resetGame: Limpando dados do store');
            caixaMisteriosaStore.setData(null);
            localStorage.removeItem('caixaMisteriosa_liveGame');
        }
        return result;
    };

    const generateClues = async (productName, customPrompt = null) => {
        const payload = { productName };
        if (customPrompt) {
            payload.customPrompt = customPrompt;
        }
        return await apiFetch('/products/generate-clues', { method: 'POST', body: JSON.stringify(payload) });
    };

    const createProduct = async (sponsorId, name, clues) => {
        const payload = { sponsorId, name, clues };
        return await apiFetch('/products/create', { method: 'POST', body: JSON.stringify(payload) });
    };

    const updateProduct = async (productId, name, clues) => {
        const payload = { name, clues };
        return await apiFetch(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) });
    };

    const createSponsor = async (name, logo_url, facebook_url, instagram_url, whatsapp, address) => {
        const payload = { name, logo_url, facebook_url, instagram_url, whatsapp, address };
        return await apiFetch('/sponsors', { method: 'POST', body: JSON.stringify(payload) });
    };

    const updateSponsor = async (sponsorId, name, logo_url, facebook_url, instagram_url, whatsapp, address) => {
        const payload = { name, logo_url, facebook_url, instagram_url, whatsapp, address };
        return await apiFetch(`/sponsors/${sponsorId}`, { method: 'PUT', body: JSON.stringify(payload) });
    };

    return {
        liveGame: state.liveGame,
        lastFinishedGame: state.lastFinishedGame, // Expor novo estado
        sponsors,
        products,
        loading: state.loading,
        error: state.error,
        actions: {
            fetchLiveGame: () => caixaMisteriosaStore.fetchLiveGame(),
            refreshLiveGame: () => caixaMisteriosaStore.refreshLiveGame(),
            fetchSponsors,
            fetchProductsBySponsor,
            submitGuess,
            startGame,
            revealClue,
            endSubmissions,
            drawWinner,
            resetGame,
            generateClues,
            createProduct,
            updateProduct,
            createSponsor,
            updateSponsor,
        }
    };
}
