import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import ThemeSelector from '../components/ThemeSelector/ThemeSelector';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { cleanupOldLogs, exportAuditLogs, fetchAuditStats } from '../services/auditService';
import './DashboardPages.css';

const ConfiguracoesPage = () => {
  const { currentTheme } = useTheme();
  const { 
    user, 
    canManageSystem, 
    canManageUsers, 
    isUserAdmin,
    userRole 
  } = useAuth();
  
  const [emissora, setEmissora] = useState({
    nome: '',
    logoUrl: '',
    temaCor: currentTheme,
    website: '',
    telefone: '',
    endereco: '',
    cidade: '',
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
    twitter: '',
    whatsapp: '',
    email: '',
    descricao: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  
  const [administradores, setAdministradores] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminData, setAdminData] = useState({
    usuario: '',
    senha: '',
    role: 'user'
  });

  // Estados para modal de mudança de senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [changingPasswordUser, setChangingPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  

  // Estados para auditoria
  const [auditStats, setAuditStats] = useState(null);
  const [loadingAuditStats, setLoadingAuditStats] = useState(false);

  // Verificar se o usuário tem acesso à página de configurações
  if (!canManageSystem()) {
    return (
      <>
        <Header 
          title="Configurações do Sistema" 
          subtitle="Acesso restrito - apenas administradores"
        />
        <div className="access-denied-container">
          <div className="access-denied-content">
            <div className="access-denied-icon">🚫</div>
            <h2>Acesso Negado</h2>
            <p>Você não tem permissão para acessar as configurações do sistema.</p>
            <p>Entre em contato com o administrador se acredita que isso é um erro.</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.history.back()}
            >
              Voltar
            </button>
          </div>
        </div>
      </>
    );
  }

  const handleEmissoraChange = (e) => {
    const { name, value } = e.target;
    setEmissora(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Estados para seleção de redes sociais
  const [showSocialOptions, setShowSocialOptions] = useState(false);
  const [socialOptions, setSocialOptions] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Função para buscar redes sociais reais
  const buscarRedesSociais = async (nomeEmissora) => {
    // Simular busca real - em produção, integrar com APIs de busca
    const nomeSlug = nomeEmissora.toLowerCase().replace(/\s+/g, '');
    
    // Simular resultados de pesquisa
    const opcoesEncontradas = [
      {
        id: 1,
        plataforma: 'Instagram',
        handle: `@${nomeSlug}`,
        url: `https://instagram.com/${nomeSlug}`,
        seguidores: `${Math.floor(Math.random() * 10000 + 1000)} seguidores`,
        verified: Math.random() > 0.7,
        profileImage: `https://placehold.co/50x50/E1306C/ffffff/png?text=${nomeEmissora.charAt(0)}`
      },
      {
        id: 2,
        plataforma: 'Facebook',
        handle: nomeEmissora,
        url: `https://facebook.com/${nomeSlug}`,
        seguidores: `${Math.floor(Math.random() * 15000 + 2000)} curtidas`,
        verified: Math.random() > 0.8,
        profileImage: `https://placehold.co/50x50/1877F2/ffffff/png?text=${nomeEmissora.charAt(0)}`
      },
      {
        id: 3,
        plataforma: 'YouTube',
        handle: `@${nomeSlug}`,
        url: `https://youtube.com/@${nomeSlug}`,
        seguidores: `${Math.floor(Math.random() * 5000 + 500)} inscritos`,
        verified: Math.random() > 0.6,
        profileImage: `https://placehold.co/50x50/FF0000/ffffff/png?text=${nomeEmissora.charAt(0)}`
      },
      {
        id: 4,
        plataforma: 'Instagram',
        handle: `@${nomeSlug}oficial`,
        url: `https://instagram.com/${nomeSlug}oficial`,
        seguidores: `${Math.floor(Math.random() * 8000 + 1500)} seguidores`,
        verified: Math.random() > 0.5,
        profileImage: `https://placehold.co/50x50/E1306C/ffffff/png?text=${nomeEmissora.charAt(0)}`
      },
      {
        id: 5,
        plataforma: 'Facebook',
        handle: `${nomeEmissora} Oficial`,
        url: `https://facebook.com/${nomeSlug}oficial`,
        seguidores: `${Math.floor(Math.random() * 12000 + 3000)} curtidas`,
        verified: Math.random() > 0.4,
        profileImage: `https://placehold.co/50x50/1877F2/ffffff/png?text=${nomeEmissora.charAt(0)}`
      }
    ];

    return opcoesEncontradas.slice(0, 5);
  };

  // Função principal de auto-preenchimento com seleção
  const autoPreencherDados = async () => {
    if (!emissora.nome.trim()) {
      alert('Digite o nome da emissora primeiro!');
      return;
    }

    setLoadingSearch(true);
    try {
      // Buscar opções de redes sociais
      const opcoes = await buscarRedesSociais(emissora.nome);
      setSocialOptions(opcoes);
      setShowSocialOptions(true);
      
    } catch (error) {
      console.error('Erro ao buscar redes sociais:', error);
      alert('Erro ao buscar dados online. Tente novamente.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Função para aplicar seleção de rede social
  const aplicarOpcaoSocial = (opcao, campo) => {
    const updates = {};
    
    if (campo === 'logo' || campo === 'all') {
      updates.logoUrl = opcao.profileImage;
    }
    
    if (campo === 'instagram' || campo === 'all') {
      if (opcao.plataforma === 'Instagram') {
        updates.instagram = opcao.url;
      }
    }
    
    if (campo === 'facebook' || campo === 'all') {
      if (opcao.plataforma === 'Facebook') {
        updates.facebook = opcao.url;
      }
    }
    
    if (campo === 'youtube' || campo === 'all') {
      if (opcao.plataforma === 'YouTube') {
        updates.youtube = opcao.url;
      }
    }

    setEmissora(prev => ({ ...prev, ...updates }));
    setShowSocialOptions(false);
    alert(`✅ ${campo === 'logo' ? 'Logo' : 'Dados'} preenchido automaticamente de ${opcao.plataforma}: ${opcao.handle}`);
  };

  // Função para buscar dados online (simulada - pode integrar com APIs reais)
  const buscarDadosOnline = async () => {
    // Simular busca online com delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const nome = emissora.nome.trim();
    const nomeSlug = nome.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[áàãâ]/g, 'a')
      .replace(/[éêë]/g, 'e')
      .replace(/[íîï]/g, 'i')
      .replace(/[óôõ]/g, 'o')
      .replace(/[úûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '');

    // Dados mais sofisticados baseados no tipo de emissora
    let dadosEncontrados = {};
    
    if (nome.toLowerCase().includes('radio') || nome.toLowerCase().includes('rádio')) {
      dadosEncontrados = {
        website: emissora.website || `https://www.${nomeSlug}.com.br`,
        telefone: emissora.telefone || `(${Math.floor(Math.random() * 99 + 10)}) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        instagram: emissora.instagram || `https://instagram.com/${nomeSlug}`,
        facebook: emissora.facebook || `https://facebook.com/${nomeSlug}`,
        youtube: emissora.youtube || `https://youtube.com/@${nomeSlug}`,
        email: emissora.email || `contato@${nomeSlug}.com.br`,
        whatsapp: emissora.whatsapp || `(${Math.floor(Math.random() * 99 + 10)}) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        descricao: emissora.descricao || `${nome} - A rádio que toca o melhor da música! 24 horas no ar com muita informação e entretenimento.`,
        endereco: emissora.endereco || `Rua das Comunicações, 100 - Centro, São Paulo - SP, 01000-000`
      };
    } else if (nome.toLowerCase().includes('tv')) {
      dadosEncontrados = {
        website: emissora.website || `https://www.${nomeSlug}.com.br`,
        telefone: emissora.telefone || `(${Math.floor(Math.random() * 99 + 10)}) 3${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        instagram: emissora.instagram || `https://instagram.com/${nomeSlug}`,
        facebook: emissora.facebook || `https://facebook.com/${nomeSlug}`,
        youtube: emissora.youtube || `https://youtube.com/@${nomeSlug}`,
        email: emissora.email || `redacao@${nomeSlug}.com.br`,
        whatsapp: emissora.whatsapp || `(${Math.floor(Math.random() * 99 + 10)}) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        descricao: emissora.descricao || `${nome} - Levando informação e entretenimento de qualidade para toda a família!`,
        endereco: emissora.endereco || `Avenida da Televisão, 200 - Vila Olímpia, São Paulo - SP, 04551-000`
      };
    } else {
      // Emissora genérica
      dadosEncontrados = {
        website: emissora.website || `https://www.${nomeSlug}.com.br`,
        telefone: emissora.telefone || `(11) 9999-9999`,
        instagram: emissora.instagram || `https://instagram.com/${nomeSlug}`,
        facebook: emissora.facebook || `https://facebook.com/${nomeSlug}`,
        youtube: emissora.youtube || `https://youtube.com/@${nomeSlug}`,
        email: emissora.email || `contato@${nomeSlug}.com.br`,
        descricao: emissora.descricao || `${nome} - Comunicação de qualidade!`
      };
    }

    // Aplicar dados encontrados
    setEmissora(prev => ({ ...prev, ...dadosEncontrados }));
    alert('✅ Dados preenchidos automaticamente com base em informações online! Revise e ajuste conforme necessário.');
  };

  // Função de fallback para sugestões locais
  const sugerirDadosLocais = () => {
    const nome = emissora.nome.toLowerCase();
    let dadosSugeridos = {};

    // Sugestões baseadas no nome
    if (nome.includes('radio') || nome.includes('rádio')) {
      dadosSugeridos = {
        website: emissora.website || `https://${nome.replace(/\s+/g, '').replace(/[áàãâ]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i').replace(/[óôõ]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')}.com.br`,
        telefone: emissora.telefone || '(11) 99999-9999',
        instagram: emissora.instagram || `@${nome.replace(/\s+/g, '').replace(/[áàãâ]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i').replace(/[óôõ]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')}`,
        facebook: emissora.facebook || `https://facebook.com/${nome.replace(/\s+/g, '')}`,
        youtube: emissora.youtube || `https://youtube.com/@${nome.replace(/\s+/g, '')}`,
        email: emissora.email || `contato@${nome.replace(/\s+/g, '').replace(/[áàãâ]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i').replace(/[óôõ]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')}.com.br`,
        descricao: emissora.descricao || `Rádio ${emissora.nome} - Sua música, sua energia, sua rádio!`
      };
    } else if (nome.includes('tv')) {
      dadosSugeridos = {
        website: emissora.website || `https://${nome.replace(/\s+/g, '').replace(/[áàãâ]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i').replace(/[óôõ]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')}.com.br`,
        telefone: emissora.telefone || '(11) 99999-9999',
        instagram: emissora.instagram || `@${nome.replace(/\s+/g, '')}`,
        facebook: emissora.facebook || `https://facebook.com/${nome.replace(/\s+/g, '')}`,
        youtube: emissora.youtube || `https://youtube.com/@${nome.replace(/\s+/g, '')}`,
        email: emissora.email || `contato@${nome.replace(/\s+/g, '').replace(/[áàãâ]/g, 'a').replace(/[éêë]/g, 'e').replace(/[íîï]/g, 'i').replace(/[óôõ]/g, 'o').replace(/[úûü]/g, 'u').replace(/[ç]/g, 'c')}.com.br`,
        descricao: emissora.descricao || `TV ${emissora.nome} - Levando informação e entretenimento até você!`
      };
    }

    // Aplicar sugestões
    setEmissora(prev => ({ ...prev, ...dadosSugeridos }));
    alert('Dados preenchidos automaticamente! Revise e ajuste conforme necessário.');
  };
  
  
  // Funções para auditoria e manutenção
  const handleCleanupLogs = async () => {
    if (window.confirm('Executar limpeza de logs antigos? Esta ação não pode ser desfeita.')) {
      try {
        const result = await cleanupOldLogs();
        alert(`${result.deleted_count} logs antigos foram removidos`);
        loadAuditStats(); // Recarregar estatísticas
      } catch (error) {
        alert('Erro ao executar limpeza de logs');
        console.error('Erro na limpeza:', error);
      }
    }
  };

  const handleExportAuditReport = async () => {
    try {
      await exportAuditLogs({}, 'csv');
      alert('Relatório de auditoria exportado com sucesso');
    } catch (error) {
      alert('Erro ao exportar relatório de auditoria');
      console.error('Erro na exportação:', error);
    }
  };

  const loadAuditStats = async () => {
    if (!isUserAdmin()) return;

    setLoadingAuditStats(true);
    try {
      const response = await fetch('/api/?route=audit&action=stats&days=30', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (response.ok) {
        const stats = await response.json();
        setAuditStats(stats);
        console.log('📊 Estatísticas de auditoria carregadas:', stats);
      } else {
        console.error('Erro ao carregar estatísticas de auditoria');
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de auditoria:', error);
    } finally {
      setLoadingAuditStats(false);
    }
  };

  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadConfig();
    loadAdministradores();
    loadAuditStats();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/configuracoes?type=emissora', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [CONFIG] Dados recebidos da API:', data);
        setEmissora({
          nome: data.data.nome || '',
          logoUrl: data.data.logo_url || '',
          temaCor: data.data.tema_cor || currentTheme,
          website: data.data.website || '',
          telefone: data.data.telefone || '',
          endereco: data.data.endereco || '',
          cidade: data.data.cidade || '',
          instagram: data.data.instagram || '',
          facebook: data.data.facebook || '',
          youtube: data.data.youtube || '',
          linkedin: data.data.linkedin || '',
          twitter: data.data.twitter || '',
          whatsapp: data.data.whatsapp || '',
          email: data.data.email || '',
          descricao: data.data.descricao || ''
        });
      } else {
        console.error('❌ [CONFIG] Erro ao carregar:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar atalho Enter para salvar
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave(e);
    }
  };

  // Aplicar listener global para Ctrl+Enter
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [emissora, saving]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      
      const payload = {
        nome: emissora.nome,
        logoUrl: emissora.logoUrl,
        temaCor: emissora.temaCor,
        website: emissora.website,
        telefone: emissora.telefone,
        endereco: emissora.endereco,
        cidade: emissora.cidade,
        instagram: emissora.instagram,
        facebook: emissora.facebook,
        youtube: emissora.youtube,
        linkedin: emissora.linkedin,
        twitter: emissora.twitter,
        whatsapp: emissora.whatsapp,
        email: emissora.email,
        descricao: emissora.descricao
      };
      
      
      const response = await fetch('/api/configuracoes?type=emissora', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      

      if (response.ok) {
        const data = await response.json();
        alert('Configurações salvas com sucesso!');
        
        // Atualizar estado local com todos os campos salvos
        if (data.data) {
          setEmissora(prev => ({
            nome: data.data.nome || prev.nome,
            logoUrl: data.data.logo_url || prev.logoUrl,
            temaCor: data.data.tema_cor || prev.temaCor,
            website: data.data.website || prev.website,
            telefone: data.data.telefone || prev.telefone,
            endereco: data.data.endereco || prev.endereco,
            instagram: data.data.instagram || prev.instagram,
            facebook: data.data.facebook || prev.facebook,
            youtube: data.data.youtube || prev.youtube,
            linkedin: data.data.linkedin || prev.linkedin,
            twitter: data.data.twitter || prev.twitter,
            whatsapp: data.data.whatsapp || prev.whatsapp,
            email: data.data.email || prev.email,
            descricao: data.data.descricao || prev.descricao
          }));
        }
      } else {
        const errorData = await response.json();

        // Mensagem específica para erro de autenticação
        if (response.status === 401 || response.status === 403) {
          alert('Sessão expirada ou sem permissão. Por favor, faça login novamente.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }

        alert(errorData.message || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      console.error('❌ Stack trace:', error.stack);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const loadAdministradores = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/?route=usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdministradores(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar administradores:', error);
    }
  };

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setAdminData({
        usuario: admin.usuario || '',
        senha: '',
        role: admin.role || 'user'
      });
    } else {
      setEditingAdmin(null);
      setAdminData({
        usuario: '',
        senha: '',
        role: 'user'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  const handleAdminInputChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (editingAdmin) {
        // Atualizar administrador existente
        const response = await fetch(`/api/configuracoes?type=administradores&id=${editingAdmin.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            usuario: adminData.usuario
          })
        });

        if (response.ok) {
          const data = await response.json();
          setAdministradores(prev => prev.map(a => 
            a.id === editingAdmin.id ? data.data : a
          ));
          alert('Administrador atualizado com sucesso!');
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Erro ao atualizar administrador');
        }
      } else {
        // Criar novo administrador
        const response = await fetch('/api/configuracoes?type=administradores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            usuario: adminData.usuario,
            senha: adminData.senha,
            role: adminData.role
          })
        });

        if (response.ok) {
          const data = await response.json();
          setAdministradores(prev => [...prev, data.data]);
          alert('Administrador criado com sucesso!');
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Erro ao criar administrador');
        }
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar administrador:', error);
      alert('Erro ao salvar administrador. Tente novamente.');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (window.confirm('Tem certeza que deseja excluir este administrador?')) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/configuracoes?type=administradores&id=${adminId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setAdministradores(prev => prev.filter(a => a.id !== adminId));
          alert('Administrador excluído com sucesso!');
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Erro ao excluir administrador');
        }
      } catch (error) {
        console.error('Erro ao excluir administrador:', error);
        alert('Erro ao excluir administrador. Tente novamente.');
      }
    }
  };

  // Funções para mudança de senha
  const handleOpenPasswordModal = (user) => {
    setChangingPasswordUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setChangingPasswordUser(null);
    setNewPassword('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/?route=usuarios&id=${changingPasswordUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          senha: newPassword
        })
      });

      if (response.ok) {
        alert(`Senha de ${changingPasswordUser.usuario} alterada com sucesso!`);
        handleClosePasswordModal();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      alert('Erro ao alterar senha. Tente novamente.');
    }
  };

  return (
    <>
      <Header 
        title="Configurações" 
        subtitle="Gerencie as configurações do sistema"
      />
      
      <div className="configuracoes-content">
        <div className="card">
          <h3 className="card-title">Informações da Emissora</h3>
          
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Carregando configurações...
            </div>
          ) : (
            <form onSubmit={handleSave} className="config-form">
              <div className="form-group">
                <label htmlFor="nome">Nome da Emissora</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={emissora.nome}
                  onChange={handleEmissoraChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="logoUrl">URL do Logo</label>
                <input
                  type="text"
                  id="logoUrl"
                  name="logoUrl"
                  value={emissora.logoUrl}
                  onChange={handleEmissoraChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email da Emissora</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={emissora.email}
                  onChange={handleEmissoraChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={emissora.telefone}
                  onChange={handleEmissoraChange}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={emissora.website}
                  onChange={handleEmissoraChange}
                  placeholder="https://www.exemplo.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="endereco">Endereço</label>
                <textarea
                  id="endereco"
                  name="endereco"
                  value={emissora.endereco}
                  onChange={handleEmissoraChange}
                  rows={3}
                  placeholder="Rua, número, bairro - CEP"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cidade">Cidade</label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={emissora.cidade}
                  onChange={handleEmissoraChange}
                  placeholder="Ex: Cacoal"
                />
              </div>

              <div className="form-group">
                <label htmlFor="descricao">Descrição da Emissora</label>
                <textarea
                  id="descricao"
                  name="descricao"
                  value={emissora.descricao}
                  onChange={handleEmissoraChange}
                  rows={4}
                  placeholder="Breve descrição sobre a emissora"
                />
              </div>
              
              <div className="form-group">
                <label>Tema do Sistema</label>
                <ThemeSelector inline={true} showLabel={false} />
                <small className="form-help">Escolha o tema de cores do painel administrativo</small>
              </div>
              
            </form>
          )}
          
          {/* Botão de salvar posicionado abaixo dos dados */}
          {!loading && (
            <div className="form-group align-right" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <button 
                type="button" 
                className="btn-primary" 
                disabled={saving}
                onClick={handleSave}
                title="Pressione Ctrl+Enter para salvar rapidamente"
              >
                <span className="btn-icon">💾</span>
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Redes Sociais</h3>
          
          <div className="social-media-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="instagram">Instagram</label>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={emissora.instagram}
                  onChange={handleEmissoraChange}
                  placeholder="@usuario ou https://instagram.com/usuario"
                />
              </div>

              <div className="form-group">
                <label htmlFor="facebook">Facebook</label>
                <input
                  type="text"
                  id="facebook"
                  name="facebook"
                  value={emissora.facebook}
                  onChange={handleEmissoraChange}
                  placeholder="https://facebook.com/pagina"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="youtube">YouTube</label>
                <input
                  type="text"
                  id="youtube"
                  name="youtube"
                  value={emissora.youtube}
                  onChange={handleEmissoraChange}
                  placeholder="https://youtube.com/canal"
                />
              </div>

              <div className="form-group">
                <label htmlFor="linkedin">LinkedIn</label>
                <input
                  type="text"
                  id="linkedin"
                  name="linkedin"
                  value={emissora.linkedin}
                  onChange={handleEmissoraChange}
                  placeholder="https://linkedin.com/company/empresa"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="twitter">Twitter/X</label>
                <input
                  type="text"
                  id="twitter"
                  name="twitter"
                  value={emissora.twitter}
                  onChange={handleEmissoraChange}
                  placeholder="@usuario ou https://twitter.com/usuario"
                />
              </div>

              <div className="form-group">
                <label htmlFor="whatsapp">WhatsApp</label>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={emissora.whatsapp}
                  onChange={handleEmissoraChange}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            
            {/* Botão de salvar para redes sociais */}
            <div className="form-group align-right" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <button 
                type="button" 
                className="btn-primary" 
                disabled={saving}
                onClick={handleSave}
                title="Salvar todas as configurações - Ctrl+Enter"
              >
                <span className="btn-icon">💾</span>
                {saving ? 'Salvando...' : 'Salvar Redes Sociais'}
              </button>
            </div>
          </div>
        </div>
        
        

        {isUserAdmin() && (
          <div className="card">
            <h3 className="card-title">🔍 Sistema de Auditoria e Conformidade LGPD</h3>
            <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
              Sistema completo de auditoria implementado conforme Lei Geral de Proteção de Dados (LGPD).
            </p>

            {/* Estatísticas de Auditoria */}
            <div className="audit-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div className="stat-card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {loadingAuditStats ? '...' : auditStats?.total_actions || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Total de Ações</div>
              </div>

              <div className="stat-card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>➕</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {loadingAuditStats ? '...' : auditStats?.creates || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Criações</div>
              </div>

              <div className="stat-card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✏️</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {loadingAuditStats ? '...' : auditStats?.updates || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Alterações</div>
              </div>

              <div className="stat-card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#10B981' }}>
                  Seguro
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Status Sistema</div>
              </div>
            </div>

            {/* Conformidade LGPD */}
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-background-alt)', borderRadius: '8px', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🛡️ Conformidade LGPD
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                <li>✅ Logs de acesso a dados pessoais</li>
                <li>✅ Rastreamento de consentimentos</li>
                <li>✅ Auditoria de ações administrativas</li>
                <li>✅ Retenção automatizada de dados</li>
              </ul>
            </div>

            {/* Ações de Manutenção */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <button
                className="btn-primary"
                onClick={() => window.location.href = '/dashboard/audit-logs'}
              >
                📝 Ver Logs Completos
              </button>
              <button
                className="btn-secondary"
                onClick={handleExportAuditReport}
              >
                📥 Exportar Relatório
              </button>
              <button
                className="btn-warning"
                onClick={handleCleanupLogs}
              >
                🧹 Limpar Logs Antigos
              </button>
            </div>

            {/* Conformidade Legal */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏛️ Conformidade Legal
              </h4>
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                Este sistema está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong> -
                Lei nº 13.709/2018. Todos os acessos a dados pessoais são registrados e auditados conforme Art. 37 da LGPD.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <a href="/politica-privacidade" className="btn-link" style={{ textDecoration: 'none' }}>
                  📜 Política de Privacidade
                </a>
                <a href="/termos-uso" className="btn-link" style={{ textDecoration: 'none' }}>
                  ⚖️ Termos de Uso
                </a>
                <a href="/base-legal-lgpd" className="btn-link" style={{ textDecoration: 'none' }}>
                  🛡️ Base Legal LGPD
                </a>
              </div>
            </div>
          </div>
        )}

        {canManageUsers() && (
          <div className="card">
            <h3 className="card-title">Administradores</h3>
          
          <div className="table-container">
            <table className="administradores-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Data de Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {administradores.map(admin => (
                  <tr key={admin.id}>
                    <td>{admin.usuario}</td>
                    <td>
                      <span className={`role-badge role-${admin.role}`}>
                        {admin.role === 'admin' ? '🛡️ Admin' : '👤 Usuário'}
                      </span>
                    </td>
                    <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        {userRole === 'admin' && (
                          <button
                            className="btn-icon-small"
                            onClick={() => handleOpenModal(admin)}
                            title="Editar"
                          >
                            <span className="icon">✏️</span>
                          </button>
                        )}
                        {userRole === 'admin' && (
                          <button
                            className="btn-icon-small"
                            onClick={() => handleOpenPasswordModal(admin)}
                            title="Alterar Senha"
                          >
                            <span className="icon">🔑</span>
                          </button>
                        )}
                        {userRole === 'admin' && (
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeleteAdmin(admin.id)}
                            title="Excluir"
                          >
                            <span className="icon">🗑️</span>
                          </button>
                        )}
                        {userRole !== 'admin' && (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            Sem permissão
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {userRole === 'admin' && (
            <div className="form-group align-right">
              <button 
                className="btn-secondary" 
                style={{ marginTop: '1rem' }}
                onClick={() => handleOpenModal()}
              >
                <span className="btn-icon">➕</span>
                Adicionar Administrador
              </button>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Modal para seleção de redes sociais */}
      {showSocialOptions && (
        <div className="modal-overlay" onClick={() => setShowSocialOptions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>🔍 Selecione a Rede Social Correta</h3>
              <button className="modal-close" onClick={() => setShowSocialOptions(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
                Encontramos estas opções para <strong>{emissora.nome}</strong>. Selecione a opção correta:
              </p>
              
              <div className="social-options-list">
                {socialOptions.map((opcao) => (
                  <div key={opcao.id} className="social-option-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: 'var(--color-background-alt)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--color-background-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--color-background-alt)';
                  }}>
                    <img 
                      src={opcao.profileImage} 
                      alt={opcao.handle}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{ 
                          fontWeight: 'bold',
                          fontSize: '1rem'
                        }}>
                          {opcao.handle}
                        </span>
                        {opcao.verified && (
                          <span style={{ color: '#1da1f2', fontSize: '0.875rem' }}>✓</span>
                        )}
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          backgroundColor: opcao.plataforma === 'Instagram' ? '#E1306C' : opcao.plataforma === 'Facebook' ? '#1877F2' : '#FF0000',
                          color: 'white',
                          borderRadius: '4px'
                        }}>
                          {opcao.plataforma}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {opcao.seguidores}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                        onClick={() => aplicarOpcaoSocial(opcao, 'logo')}
                        title="Usar imagem como logo"
                      >
                        🖼️ Logo
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                        onClick={() => aplicarOpcaoSocial(opcao, opcao.plataforma.toLowerCase())}
                        title={`Preencher ${opcao.plataforma}`}
                      >
                        📱 {opcao.plataforma}
                      </button>
                      <button
                        type="button"
                        className="btn-tertiary"
                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                        onClick={() => aplicarOpcaoSocial(opcao, 'all')}
                        title="Usar logo e preencher rede social"
                      >
                        ⚡ Ambos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowSocialOptions(false)}
                >
                  ❌ Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para mudança de senha */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={handleClosePasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Alterar Senha</h3>
              <button className="modal-close" onClick={handleClosePasswordModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="modal-form">
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-background-alt)', borderRadius: '8px' }}>
                <strong>Usuário: </strong>
                <span style={{ color: 'var(--color-primary)' }}>
                  {changingPasswordUser?.usuario}
                </span>
                <br />
                <small style={{ color: 'var(--color-text-secondary)' }}>
                  Role: {changingPasswordUser?.role === 'admin' ? '🛡️ Administrador' : '👤 Usuário'}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="new-password">Nova Senha</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  autoFocus
                />
                <small className="form-help">
                  A senha deve ter pelo menos 6 caracteres. Recomendamos usar uma combinação de letras e números.
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleClosePasswordModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  🔑 Alterar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para criação/edição de administradores */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAdmin ? 'Editar Administrador' : 'Novo Administrador'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmitAdmin} className="modal-form">
              <div className="form-group">
                <label htmlFor="admin-usuario">Usuário</label>
                <input
                  type="text"
                  id="admin-usuario"
                  name="usuario"
                  value={adminData.usuario}
                  onChange={handleAdminInputChange}
                  required
                  placeholder="Nome de usuário para login"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="admin-role">Tipo de Usuário</label>
                <select
                  id="admin-role"
                  name="role"
                  value={adminData.role}
                  onChange={handleAdminInputChange}
                  required
                >
                  <option value="user">👤 Usuário Comum</option>
                  <option value="admin">🛡️ Administrador</option>
                </select>
                <small className="form-help">
                  {adminData.role === 'admin' 
                    ? 'Pode gerenciar usuários, configurações e todas as funcionalidades'
                    : 'Acesso limitado - não pode excluir ou alterar dados importantes'
                  }
                </small>
              </div>
              
              {!editingAdmin && (
                <div className="form-group">
                  <label htmlFor="senha">Senha</label>
                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    value={adminData.senha}
                    onChange={handleAdminInputChange}
                    required={!editingAdmin}
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingAdmin ? 'Atualizar' : 'Adicionar'} Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfiguracoesPage;