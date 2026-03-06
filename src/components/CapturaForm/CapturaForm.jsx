// src/components/CapturaForm/CapturaForm.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CapturaForm.css';
import { fetchPromocoes } from '../../services/promocaoService';
import { auditHelpers } from '../../services/auditService';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeSelector from '../ThemeSelector/ThemeSelector';
import { filtrarBairrosAutocomplete, validarBairro } from '../../utils/bairrosUtils';
import { submitWithRetry } from '../../services/smartQueueService';

// Componente de Skeleton para o cabeçalho do formulário
const FormHeaderSkeleton = () => (
  <div className="form-header skeleton-container">
    <div className="emissora-logo-section">
      <div className="skeleton skeleton-logo"></div>
    </div>
    <div className="promocao-info">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text"></div>
    </div>
  </div>
);


// Componente principal do formulário de captura
const CapturaForm = () => {
  const navigate = useNavigate();
  const { currentTheme, currentThemeData, changeTheme } = useTheme();

  // --- ESTADO DO COMPONENTE ---
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    bairro: '',
    cidade: 'Cacoal', // Cidade padrão pré-preenchida
  });

  const [promocao, setPromocao] = useState({
    id: null,
    nome: '',
    descricao: '',
    imagem_url: '',
  });

  const [promocoesDisponiveis, setPromocoesDisponiveis] = useState([]);
  const [mostrarSeletorPromocao, setMostrarSeletorPromocao] = useState(false);

  const [emissora, setEmissora] = useState({
    nome: '',
    logo_url: '',
    tema_cor: 'azul',
    instagram: '',
    facebook: '',
    youtube: '',
    website: '',
    telefone: ''
  });

  const [geolocalizacao, setGeolocalizacao] = useState(null);
  const [origem, setOrigem] = useState({ source: '', medium: '' });

  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Novo estado para o carregamento inicial
  const [sugestoesBairro, setSugestoesBairro] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null); // Estado para feedback da fila

  // --- EFEITOS (LÓGICA QUE RODA QUANDO O COMPONENTE CARREGA) ---

  // Função para buscar dados da promoção na API (usando useCallback para otimização)
  const fetchPromocaoData = useCallback(async (identifier) => {
    try {
      let response;
      if (/^\d+$/.test(identifier)) {
        response = await fetch(`/api/promocoes?id=${identifier}`);
      } else {
        response = await fetch(`/api/promocoes-slug?slug=${identifier}`);
      }

      if (!response.ok) {
        throw new Error('Promoção não encontrada');
      }

      const data = await response.json();
      const promocaoData = data.data[0] || data.data;
      setPromocao({
        id: promocaoData.id,
        nome: promocaoData.nome,
        descricao: promocaoData.descricao,
        imagem_url: promocaoData.imagem_url || '',
      });
    } catch (error) {
      console.error('Erro ao buscar promoção:', error);
      setPromocao({
        nome: 'Promoção não encontrada',
        descricao: 'Verifique o link de participação.',
      });
    }
  }, []);

  // Função para buscar promoções ativas (usando useCallback)
  const fetchPromocoesAtivas = useCallback(async () => {
    try {
      const response = await fetch('/api/promocoes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

      const result = await response.json();
      const promocoesAtivas = result.data.filter(p => p.status && p.status.toLowerCase() === 'ativa');
      setPromocoesDisponiveis(promocoesAtivas);
    } catch (error) {
      console.error('❌ Erro ao buscar promoções ativas:', error);
      setPromocoesDisponiveis([]);
    }
  }, []);

  // Função para buscar dados da emissora na API (usando useCallback)
  const fetchEmissoraData = useCallback(async () => {
    try {
      const response = await fetch('/api/configuracoes?type=emissora');
      if (!response.ok) return;

      const data = await response.json();
      const emissoraData = data.data;
      setEmissora(prev => ({ ...prev, ...emissoraData }));

      // ✅ Preencher cidade automaticamente a partir das configurações da emissora
      if (emissoraData.cidade) {
        setFormData(prev => ({ ...prev, cidade: emissoraData.cidade }));
      }
    } catch (error) {
      console.warn('Erro ao buscar emissora:', error);
    }
  }, []);

  // Efeito principal para carregar todos os dados iniciais em paralelo
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      const promocaoId = params.get('id') || params.get('promoId'); // Aceita ambos os parâmetros
      const promocaoSlug = params.get('slug');

      setOrigem({
        source: params.get('utm_source') || 'direto',
        medium: params.get('utm_medium') || 'link',
      });

      let promocaoIdentifier = promocaoId || (promocaoSlug === 'tv-surui---comando-na-tv' ? '7' : promocaoSlug);

      const dataPromises = [fetchEmissoraData()];

      if (promocaoIdentifier) {
        dataPromises.push(fetchPromocaoData(promocaoIdentifier));
      } else {
        setMostrarSeletorPromocao(true);
        dataPromises.push(fetchPromocoesAtivas());
        setPromocao({ nome: 'Escolha uma promoção', descricao: 'Selecione a promoção desejada abaixo.' });
      }

      await Promise.all(dataPromises);
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchPromocaoData, fetchPromocoesAtivas, fetchEmissoraData]);


  // Efeito para solicitar a geolocalização (executa apenas uma vez)
  useEffect(() => {
    const obterGeolocalizacao = () => {
      if ('geolocation' in navigator && !geolocalizacao) {
        console.log('🌍 Solicitando geolocalização...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            setGeolocalizacao({ latitude, longitude, accuracy });
            console.log('✅ Geolocalização obtida:', { latitude, longitude, accuracy });
          },
          (error) => {
            console.warn('❌ Erro na geolocalização:', error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Cache por 1 minuto
          }
        );
      }
    };
    obterGeolocalizacao();
  }, []); // Array vazio = executa apenas uma vez

  // --- FUNÇÕES DE MANIPULAÇÃO ---

  // Função para formatar telefone
  const formatTelefone = (value) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 7) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length <= 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    }

    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
  };

  // Atualiza o estado do formulário conforme o usuário digita
  const handleChange = (e) => {
    const { name, value } = e.target;

    let formattedValue = value;

    // Aplicar formatação para telefone
    if (name === 'telefone') {
      formattedValue = formatTelefone(value);
    }

    // Autocomplete para bairro
    if (name === 'bairro') {
      const sugestoes = filtrarBairrosAutocomplete(value, 5);
      setSugestoesBairro(sugestoes);
      setMostrarSugestoes(sugestoes.length > 0 && value.length >= 2);
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: formattedValue,
    }));
  };

  // Função para selecionar bairro da lista de sugestões
  const handleSelecionarBairro = (bairro) => {
    setFormData((prevData) => ({
      ...prevData,
      bairro: bairro,
    }));
    setSugestoesBairro([]);
    setMostrarSugestoes(false);
  };

  // Normaliza o bairro ao sair do campo
  const handleBairroBlur = () => {
    // Aguarda um pouco para permitir clique na sugestão
    setTimeout(() => {
      if (formData.bairro) {
        const resultado = validarBairro(formData.bairro);
        setFormData((prevData) => ({
          ...prevData,
          bairro: resultado.bairro,
        }));
      }
      setMostrarSugestoes(false);
    }, 200);
  };

  // Função para lidar com a seleção de promoção
  const handlePromocaoSelection = (e) => {
    const promocaoId = e.target.value;
    if (promocaoId) {
      const promocaoSelecionada = promocoesDisponiveis.find(p => p.id == promocaoId);
      if (promocaoSelecionada) {
        setPromocao({
          id: promocaoSelecionada.id,
          nome: promocaoSelecionada.nome,
          descricao: promocaoSelecionada.descricao,
        });
      }
    } else {
      setPromocao({ nome: 'Escolha uma promoção', descricao: 'Selecione a promoção desejada abaixo.' });
    }
  };

  // Lida com o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault(); // Previne o recarregamento da página

    if (!formData.nome || !formData.telefone || !formData.bairro) {
      setErrorMessage('Nome, WhatsApp e Bairro são obrigatórios!');
      return;
    }

    if (!promocao.id) {
      setErrorMessage('Promoção não foi carregada. Verifique o link e tente novamente.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setQueueStatus(null);

    // Formatação do telefone para remover caracteres especiais
    const telefoneFormatado = formData.telefone.replace(/\D/g, '');

    const dadosCompletos = {
      promocao_id: promocao.id,
      nome: formData.nome,
      telefone: telefoneFormatado,
      bairro: formData.bairro,
      cidade: formData.cidade,
      latitude: geolocalizacao?.latitude || null,
      longitude: geolocalizacao?.longitude || null,
      origem_source: origem.source,
      origem_medium: origem.medium,
    };

    console.log('📤 Enviando para a API (via SmartQueue):', dadosCompletos);

    try {
      // ✅ SUBSTITUIÇÃO: Usar submitWithRetry em vez de fetch direto
      const responseData = await submitWithRetry(
        '/api/participantes',
        dadosCompletos,
        (statusUpdate) => {
          // Callback para atualizar UI sobre estado da fila
          console.log('🔄 Status da fila:', statusUpdate);
          setQueueStatus(statusUpdate);
        }
      );

      // Log de auditoria para criação de participante
      if (responseData.success && responseData.data) {
        try {
          auditHelpers.createParticipant(responseData.data.id);
          console.log('🔐 Criação de participante auditada:', responseData.data.id);
        } catch (auditError) {
          console.warn('⚠️ Erro no log de auditoria (criação):', auditError);
        }
      }

      setStatus('success');
      // Redirecionar para página de sucesso após 1 segundo, passando parâmetros UTM
      setTimeout(() => {
        const params = new URLSearchParams();
        if (origem.source) params.set('utm_source', origem.source);
        if (origem.medium) params.set('utm_medium', origem.medium);

        const searchString = params.toString();
        navigate(`/sucesso${searchString ? `?${searchString}` : ''}`);
      }, 1000);
    } catch (error) {
      console.error('❌ Erro no envio:', error);

      // Tratamento específico para erro de duplicidade (que vem do smartQueueService como erro normal)
      if (error.status === 409 && error.data?.error === 'DUPLICATE_PARTICIPATION') {
        setErrorMessage('Você já participou desta promoção com este número! Cada telefone pode participar apenas uma vez.');
      } else {
        setErrorMessage(error.message || 'Não foi possível registrar sua participação. Tente novamente mais tarde.');
      }

      setStatus('error');
    }
  };

  // --- RENDERIZAÇÃO DO COMPONENTE ---

  if (status === 'success') {
    return (
      <div className="container-captura">
        <div className="card-sucesso">
          <div className="icone-sucesso">✓</div>
          <h1>Participação Confirmada!</h1>
          <p>Boa sorte! Fique ligado na nossa programação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-captura tema-${emissora.tema_cor}`} style={{
      background: currentThemeData.gradient
    }}>
      {/* Seletor de Tema */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000
      }}>
        <ThemeSelector mode="inline" />
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {isLoading ? (
          <FormHeaderSkeleton />
        ) : (
          <div className="form-header">
            {/* Prioridade: 1. Imagem da promoção, 2. Logo da emissora, 3. Logo NexoGeo */}
            {promocao.imagem_url ? (
              <div className="promocao-imagem-section">
                <img
                  src={promocao.imagem_url}
                  alt={`Imagem ${promocao.nome}`}
                  className="imagem-promocao-principal"
                />
              </div>
            ) : emissora.logo_url ? (
              <div className="emissora-logo-section">
                <img
                  src={emissora.logo_url}
                  alt={`Logo ${emissora.nome}`}
                  className="logo-emissora-principal"
                />
              </div>
            ) : (
              <div className="emissora-logo-section">
                <img
                  src="/imagens/logo0.png"
                  alt="NexoGeo Logo"
                  className="logo-emissora-principal"
                />
              </div>
            )}

            <div className="promocao-info">
              <h1 className="promocao-titulo">{promocao.nome}</h1>
              {promocao.descricao && (
                <p className="promocao-descricao">{promocao.descricao}</p>
              )}
            </div>
          </div>
        )}

        {/* Seletor de promoção quando não há código na URL */}
        {mostrarSeletorPromocao && (
          <div className="promocao-selector-section">
            <div className="form-group">
              <label htmlFor="promocaoSelect">Escolha a Promoção:</label>
              <select
                id="promocaoSelect"
                name="promocaoSelect"
                onChange={handlePromocaoSelection}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}
              >
                <option value="">
                  {promocoesDisponiveis.length === 0
                    ? "Nenhuma promoção ativa disponível no momento"
                    : "Selecione uma promoção"
                  }
                </option>
                {promocoesDisponiveis.map(promocao => (
                  <option key={promocao.id} value={promocao.id}>
                    {promocao.nome} {promocao.status !== 'ativa' ? '(Encerrada)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="form-body">
          <div className="form-group">
            <label htmlFor="nome">Nome Completo</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefone">WhatsApp</label>
            <input
              type="tel"
              id="telefone"
              name="telefone"
              placeholder="(99) 99999-9999"
              value={formData.telefone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group bairro-autocomplete">
            <label htmlFor="bairro">Bairro</label>
            <input
              type="text"
              id="bairro"
              name="bairro"
              value={formData.bairro}
              onChange={handleChange}
              onBlur={handleBairroBlur}
              autoComplete="off"
              required
            />
            {mostrarSugestoes && sugestoesBairro.length > 0 && (
              <ul className="sugestoes-bairro">
                {sugestoesBairro.map((bairro, index) => (
                  <li
                    key={index}
                    onClick={() => handleSelecionarBairro(bairro)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {bairro}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="cidade">Cidade</label>
            <input
              type="text"
              id="cidade"
              name="cidade"
              value={formData.cidade}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-footer">
          {queueStatus && (
            <div className="queue-message" style={{
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#fff3cd',
              color: '#856404',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #ffeeba'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>⏳ Muita gente participando!</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>
                Você está na fila de espera... (Tentativa {queueStatus.attempt} de {queueStatus.maxRetries})
              </p>
            </div>
          )}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <div className="form-group align-right">
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                background: status === 'loading' ? '#9ca3af' : currentThemeData.gradient,
                boxShadow: status === 'loading' ? 'none' : `0 2px 8px ${currentThemeData.primary}33`
              }}
            >
              {status === 'loading' ? 'Enviando...' : 'QUERO PARTICIPAR!'}
            </button>
          </div>
        </div>
      </form>

      {/* Rodapé NexoGeo */}
      <div className="nexogeo-footer">
        <div className="nexogeo-info">
          <div className="nexogeo-logo-container">
            <img
              src="/imagens/logo0.png"
              alt="NexoGeo"
              className="nexogeo-logo-footer"
            />
          </div>
          <p className="nexogeo-description">
            Sistema completo de gestão de promoções e sorteios
          </p>
          <a
            href="/demo"
            className="nexogeo-link"
          >
            📦 Conheça a NexoGeo
          </a>
        </div>
      </div>
    </div>
  );
};

export default CapturaForm;
