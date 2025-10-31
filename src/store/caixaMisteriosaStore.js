// Store global simples para Caixa Misteriosa - IMUNE a re-renders do React

class CaixaMisteriosaStore {
    constructor() {
        this.data = null;
        this.lastFinishedGame = null; // Nova propriedade
        this.loading = true;
        this.error = null;
        this.listeners = new Set();
        this.initialized = false;

        this.loadFromStorage();
    }

    loadFromStorage() {
        console.log('🏪 Store: Carregando dados do localStorage');
        try {
            const cached = localStorage.getItem('caixaMisteriosa_liveGame');
            if (cached) {
                this.data = JSON.parse(cached);
                console.log('🏪 Store: Dados carregados do cache:', this.data?.status || 'sem status');
            } else {
                console.log('🏪 Store: Nenhum dado em cache, aguardando fetch');
                this.data = null;
            }
        } catch (e) {
            console.error('🏪 Store: Erro ao carregar localStorage:', e);
            this.data = null;
        }
        this.loading = false;
    }

    setData(data) {
        this.data = data;
        this.loading = false;
        this.error = null;

        try {
            localStorage.setItem('caixaMisteriosa_liveGame', JSON.stringify(data));
            console.log('🏪 Store: Dados salvos no localStorage');
        } catch (e) {
            console.error('🏪 Store: Erro ao salvar localStorage:', e);
        }

        this.notifyListeners();
    }

    setLoading(loading) {
        this.loading = loading;
        this.notifyListeners();
    }

    setError(error) {
        this.error = error;
        this.loading = false;
        this.notifyListeners();
    }

    getState() {
        return {
            liveGame: this.data,
            lastFinishedGame: this.lastFinishedGame, // Expor novo estado
            loading: this.loading,
            error: this.error
        };
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    async fetchLastFinishedGame() {
        try {
            const response = await fetch('/api/caixa-misteriosa/last-finished');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.lastFinishedGame = data.lastGame;
                    this.notifyListeners(); // Notifica sobre a atualização
                }
            } else {
                // 404 é normal, apenas significa que não há jogos finalizados
                this.lastFinishedGame = null;
                this.notifyListeners();
            }
        } catch (error) {
            console.error('🏪 Store: Erro ao buscar último jogo finalizado:', error);
            this.lastFinishedGame = null;
            this.notifyListeners();
        }
    }

    async fetchLiveGame(force = false) {
        if (this.initialized && !force) {
            console.log('🏪 Store: Já inicializado, não fazendo novo fetch (use force=true para forçar)');
            return;
        }

        this.initialized = true;
        this.setLoading(true);

        try {
            console.log('🏪 Store: Fazendo fetch dos dados do banco real', force ? '(FORÇADO)' : '');

            const response = await fetch('/api/caixa-misteriosa/game/live');

            if (response.status === 404) {
                console.log('🏪 Store: Nenhum jogo ativo no banco (404) - limpando dados antigos');
                this.setData(null);
                return;
            }

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('text/html')) {
                console.error('🏪 Store: API retornou HTML ao invés de JSON - possível erro de roteamento');
                throw new Error('Erro de roteamento - API retornou HTML');
            }

            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const gameData = await response.json();
            console.log('🏪 Store: Dados recebidos do banco:', gameData);

            if (gameData && gameData.giveaway && gameData.giveaway.product && gameData.giveaway.product.name) {
                this.setData(gameData);
            } else {
                console.log('🏪 Store: Resposta sem dados válidos de jogo - limpando cache');
                this.setData(null);
            }
        } catch (error) {
            console.error('🏪 Store: Erro no fetch:', error);
            this.setData(null);
        }
    }

    async refetchLiveGame() {
        console.log('🏪 Store: Fazendo refetch forçado');
        return await this.fetchLiveGame(true);
    }

    async refreshLiveGame() {
        console.log('🏪 Store: Atualizando dados sem cache');
        this.data = null;
        return await this.fetchLiveGame(true);
    }
}

// Instância singleton
const caixaMisteriosaStore = new CaixaMisteriosaStore();

export default caixaMisteriosaStore;