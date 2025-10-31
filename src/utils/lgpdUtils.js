// src/utils/lgpdUtils.js - Utilitários para proteção de dados conforme LGPD

/**
 * Mascara telefone conforme permissão do usuário
 * - Admin: telefone completo
 * - Moderator/Editor: telefone mascarado (apenas quando é ganhador)
 * - Viewer/User: sempre mascarado
 */
export const maskPhone = (phone, userRole, isWinner = false) => {
  if (!phone) return 'Não informado';
  
  // Admin sempre vê tudo
  if (userRole === 'admin') return phone;
  
  // Se é ganhador, moderators podem ver completo
  if (isWinner && userRole === 'moderator') return phone;
  
  // Máscara padrão: mostra apenas início e fim
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return '*'.repeat(cleaned.length);
  
  const start = cleaned.substring(0, 2);
  const end = cleaned.substring(cleaned.length - 2);
  const middle = '*'.repeat(cleaned.length - 4);
  
  return `${start}${middle}${end}`;
};

/**
 * Mascara email conforme permissão
 */
export const maskEmail = (email, userRole, isWinner = false) => {
  if (!email) return 'Não informado';
  
  // Admin sempre vê tudo
  if (userRole === 'admin') return email;
  
  // Se é ganhador, moderators podem ver completo
  if (isWinner && userRole === 'moderator') return email;
  
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 2 
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
};

/**
 * Mascara nome conforme necessário
 */
export const maskName = (name, userRole, isPublicDisplay = false) => {
  if (!name) return 'Não informado';
  
  // Admin sempre vê tudo
  if (userRole === 'admin') return name;
  
  // Em exibições públicas, sempre mascarar
  if (isPublicDisplay) {
    const parts = name.split(' ');
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    
    if (parts.length === 1) {
      return firstName.length > 2 
        ? `${firstName[0]}${'*'.repeat(firstName.length - 2)}${firstName[firstName.length - 1]}`
        : firstName;
    }
    
    const maskedLastName = lastName.length > 2 
      ? `${lastName[0]}${'*'.repeat(lastName.length - 2)}${lastName[lastName.length - 1]}`
      : lastName;
    
    return `${firstName} ${maskedLastName}`;
  }
  
  return name;
};

/**
 * Mascara endereço completo
 */
export const maskAddress = (address, userRole) => {
  if (!address) return 'Não informado';
  
  // Admin sempre vê tudo
  if (userRole === 'admin') return address;
  
  // Outros vêem apenas bairro/cidade
  return 'Endereço restrito';
};

/**
 * Verifica se usuário pode ver dados completos
 */
export const canViewFullData = (userRole, dataType = 'basic') => {
  const permissions = {
    admin: ['basic', 'sensitive', 'financial', 'audit'],
    moderator: ['basic', 'sensitive'],
    editor: ['basic'],
    viewer: [],
    user: []
  };
  
  return permissions[userRole]?.includes(dataType) || false;
};

/**
 * Verifica se dados podem ser exportados
 */
export const canExportData = (userRole, includesPII = false) => {
  if (includesPII) {
    return ['admin', 'moderator'].includes(userRole);
  }
  
  return ['admin', 'moderator', 'editor', 'viewer'].includes(userRole);
};

/**
 * Aplica máscara em objeto de participante
 */
export const maskParticipantData = (participant, userRole, isWinner = false) => {
  if (!participant) return null;
  
  return {
    ...participant,
    nome: maskName(participant.nome, userRole, !isWinner),
    telefone: maskPhone(participant.telefone, userRole, isWinner),
    email: maskEmail(participant.email, userRole, isWinner),
    endereco: maskAddress(participant.endereco, userRole),
    // Coordenadas sempre mascaradas exceto para admin
    latitude: canViewFullData(userRole, 'sensitive') ? participant.latitude : null,
    longitude: canViewFullData(userRole, 'sensitive') ? participant.longitude : null,
    // Dados de origem sempre disponíveis para analytics
    origem_source: participant.origem_source,
    origem_medium: participant.origem_medium,
    // Dados de localização geral (cidade/bairro) sempre disponíveis
    cidade: participant.cidade,
    bairro: participant.bairro
  };
};

/**
 * Gera log de acesso a dados pessoais (LGPD Art. 37)
 */
export const logDataAccess = async (userId, dataType, participantId, action = 'VIEW') => {
  try {
    await fetch('/api/audit/data-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        user_id: userId,
        data_type: dataType,
        participant_id: participantId,
        action: action,
        timestamp: new Date().toISOString(),
        ip_address: await getUserIP()
      })
    });
  } catch (error) {
    console.error('Erro ao registrar acesso a dados:', error);
  }
};

/**
 * Obtém IP do usuário para auditoria
 */
const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
};

/**
 * Valida se dados podem ser processados conforme base legal LGPD
 */
export const validateLegalBasis = (dataType, purpose) => {
  const legalBasisMap = {
    'marketing': 'consent', // Art. 7, I - consentimento
    'contest': 'legitimate_interest', // Art. 7, IX - interesse legítimo
    'analytics': 'legitimate_interest', // Art. 7, IX - interesse legítimo
    'audit': 'legal_obligation', // Art. 7, II - cumprimento de obrigação legal
    'security': 'vital_interests', // Art. 7, IV - proteção da vida
    'contract': 'contract_performance' // Art. 7, V - execução de contrato
  };
  
  return legalBasisMap[purpose] || 'consent';
};

/**
 * Aplica retenção de dados conforme política
 */
export const checkDataRetention = (createdDate, dataType) => {
  const retentionPeriods = {
    'participant_data': 365 * 2, // 2 anos
    'winner_data': 365 * 5, // 5 anos (obrigação fiscal)
    'logs': 90, // 90 dias
    'analytics': 365 * 1 // 1 ano
  };
  
  const days = Math.floor((new Date() - new Date(createdDate)) / (1000 * 60 * 60 * 24));
  const maxDays = retentionPeriods[dataType] || 365;
  
  return {
    shouldRetain: days <= maxDays,
    daysRemaining: (maxDays - days > 0 ? maxDays - days : 0),
    isExpired: days > maxDays
  };
};

export default {
  maskPhone,
  maskEmail,
  maskName,
  maskAddress,
  canViewFullData,
  canExportData,
  maskParticipantData,
  logDataAccess,
  validateLegalBasis,
  checkDataRetention
};