// src/components/CapturaForm/CapturaForm.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CapturaForm.css';
import { fetchPromocoes } from '../../services/promocaoService';
import { auditHelpers } from '../../services/auditService';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeSelector from '../ThemeSelector/ThemeSelector';

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
    nome: 'Carregando promoção',
    descricao: '',
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

  // --- EFEITOS (LÓGICA QUE RODA QUANDO O COMPONENTE CARREGA) ---

  // Efeito para buscar dados da promoção e parâmetros da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promocaoId = params.get('id');
    const promocaoSlug = params.get('slug');
    
    setOrigem({
      source: params.get('utm_source') || 'direto',
      medium: params.get('utm_medium') || 'link',
    });

    // Priorizar ID, mas aceitar slug como fallback
    let promocaoIdentifier = promocaoId;
    if (!promocaoIdentifier && promocaoSlug) {
      // Se for slug tv-surui---comando-na-tv, usar ID 7
      if (promocaoSlug === 'tv-surui---comando-na-tv') {
        promocaoIdentifier = '7';
      } else {
        promocaoIdentifier = promocaoSlug;
      }
    }
    
    if (promocaoIdentifier) {
      // Busca dados reais da promoção via API
      console.log(`Buscando dados da promoção: ${promocaoIdentifier}`);
      
      fetchPromocaoData(promocaoIdentifier);
    } else {
      // Se não há código de promoção, mostrar seletor com promoções ativas
      console.log('Nenhum código de promoção informado - carregando promoções ativas');
      setMostrarSeletorPromocao(true);
      fetchPromocoesAtivas();
      setPromocao({ nome: 'Escolha uma promoção', descricao: 'Selecione a promoção desejada abaixo.' });
    }

    // Buscar dados da emissora
    fetchEmissoraData();
  }, []); // O array vazio [] faz este efeito rodar apenas uma vez

  // Função para buscar dados da promoção na API
  const fetchPromocaoData = async (identifier) => {
    try {
      // Se for um número, buscar por ID diretamente
      let response;
      if (/^\d+$/.test(identifier)) {
        response = await fetch(`/api/promocoes?id=${identifier}`);
      } else {
        // Senão, usar API de slug
        response = await fetch(`/api/promocoes-slug?slug=${identifier}`);
      }
      
      if (!response.ok) {
        throw new Error('Promoção não encontrada');
      }
      
      const data = await response.json();
      const promocaoData = data.data[0] || data.data; // Pode ser array ou objeto
      setPromocao({
        id: promocaoData.id,
        nome: promocaoData.nome,
        descricao: promocaoData.descricao,
      });
    } catch (error) {
      console.error('Erro ao buscar promoção:', error);
      setPromocao({
        nome: 'Promoção não encontrada',
        descricao: 'Verifique o link de participação.',
      });
    }
  };

  // Função para buscar promoções ativas (versão pública sem token)
  const fetchPromocoesAtivas = async () => {
    try {
      console.log('📍 Iniciando busca por promoções ativas...');
      console.log('🔧 User Agent:', navigator.userAgent);
      console.log('📱 É mobile?', /Mobile|Android|iPhone|iPad/.test(navigator.userAgent));
      
      // Fazer chamada direta à API sem token (público)
      console.log('🌐 Chamando API pública de promoções...');
      const response = await fetch('/api/promocoes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const data = result.data;
      console.log('📦 Dados recebidos da API:', data);
      
      // Filtro mais rigoroso para garantir apenas promoções ativas
      const promocoesAtivas = data.filter(promocao => {
        const isActive = promocao.status && promocao.status.toLowerCase() === 'ativa';
        console.log(`📋 Promoção "${promocao.nome}": status="${promocao.status}" ativa=${isActive}`);
        return isActive;
      });
      console.log('✅ Promoções ativas filtradas:', promocoesAtivas.map(p => `${p.nome} (${p.status})`));
      
      setPromocoesDisponiveis(promocoesAtivas);
      
      if (promocoesAtivas.length === 0) {
        console.log('⚠️ Nenhuma promoção ativa encontrada');
      }
      
      console.log('📊 Total de promoções disponíveis:', promocoesAtivas.length);
    } catch (error) {
      console.error('❌ Erro ao buscar promoções ativas:', error);
      // Não usar fallback - mostrar apenas se realmente existirem promoções ativas
      setPromocoesDisponiveis([]);
      console.log('🔄 Nenhuma promoção disponível devido a erro na API');
    }
  };

  // Função para buscar dados da emissora na API
  const fetchEmissoraData = async () => {
    try {
      const response = await fetch('/api/configuracoes?type=emissora');
      
      if (!response.ok) {
        console.warn('Não foi possível carregar dados da emissora');
        return;
      }
      
      const data = await response.json();
      const emissoraData = data.data; // data.data já é o objeto da emissora
      setEmissora({
        nome: emissoraData.nome || '',
        logo_url: emissoraData.logo_url || '',
        tema_cor: emissoraData.tema_cor || 'azul',
        instagram: emissoraData.instagram || '',
        facebook: emissoraData.facebook || '',
        youtube: emissoraData.youtube || '',
        website: emissoraData.website || '',
        telefone: emissoraData.telefone || ''
      });
    } catch (error) {
      console.warn('Erro ao buscar emissora:', error);
    }
  };

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
            // Apenas tentar novamente uma vez se for erro de timeout
            if (error.code === error.TIMEOUT && !geolocalizacao) {
              setTimeout(() => {
                console.log('🔄 Tentando geolocalização novamente...');
                obterGeolocalizacao();
              }, 3000);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Cache por 1 minuto
          }
        );
      } else if (!('geolocation' in navigator)) {
        console.warn('❌ Geolocalização não suportada pelo navegador');
      }
    };

    // Executar apenas uma vez quando o componente monta
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
    
    setFormData((prevData) => ({
      ...prevData,
      [name]: formattedValue,
    }));
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

    console.log('📤 Enviando para a API:', dadosCompletos);
    console.log('📤 JSON stringified:', JSON.stringify(dadosCompletos));
    console.log('🔍 Validação frontend:', {
      promocao_id: dadosCompletos.promocao_id,
      nome: dadosCompletos.nome,
      telefone: dadosCompletos.telefone,
      campos_ok: !!(dadosCompletos.promocao_id && dadosCompletos.nome && dadosCompletos.telefone)
    });

    // Chamada real à API
    try {
      const response = await fetch('/api/participantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosCompletos),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro da API:', errorData);
        console.error('📊 Status:', response.status, response.statusText);

        // Tratar erro de participação duplicada
        if (response.status === 409 && errorData.error === 'DUPLICATE_PARTICIPATION') {
          throw new Error('Você já participou desta promoção com este número! Cada telefone pode participar apenas uma vez.');
        }

        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

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
      setStatus('error');
      setErrorMessage(error.message || 'Não foi possível registrar sua participação. Tente novamente mais tarde.');
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
        <div className="form-header">
          {/* Logo da emissora no topo (substitui o logo do sistema) */}
          {emissora.logo_url ? (
            <div className="emissora-logo-section">
              <img 
                src={emissora.logo_url} 
                alt={`Logo ${emissora.nome}`} 
                className="logo-emissora-principal" 
              />
            </div>
          ) : emissora.nome ? (
            <div className="emissora-nome-section">
              <h2 className="nome-emissora-principal">{emissora.nome}</h2>
            </div>
          ) : (
            /* Fallback para logo NexoGeo se não houver dados da emissora */
            <div className="emissora-logo-section">
              <img
                src="/imagens/logo0.png"
                alt="NexoGeo Logo"
                className="logo-emissora-principal"
              />
            </div>
          )}
          
          {/* Informações da promoção */}
          <div className="promocao-info">
            <h1 className="promocao-titulo">{promocao.nome}</h1>
            {promocao.descricao && (
              <p className="promocao-descricao">{promocao.descricao}</p>
            )}
          </div>
        </div>
        
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

          <div className="form-group">
            <label htmlFor="bairro">Bairro</label>
            <input
              type="text"
              id="bairro"
              name="bairro"
              value={formData.bairro}
              onChange={handleChange}
              required
            />
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
            href="https://nexogeo.vercel.app/demo"
            target="_blank"
            rel="noopener noreferrer"
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
