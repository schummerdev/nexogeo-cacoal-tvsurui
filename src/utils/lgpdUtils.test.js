// src/utils/lgpdUtils.test.js - Testes para utilitários LGPD
import {
  maskPhone,
  maskEmail,
  maskName,
  maskAddress,
  canViewFullData,
  canExportData,
  maskParticipantData,
  validateLegalBasis,
  checkDataRetention
} from './lgpdUtils';

describe('lgpdUtils', () => {
  describe('maskPhone', () => {
    test('admin deve ver telefone completo', () => {
      const phone = '11987654321';
      expect(maskPhone(phone, 'admin')).toBe('11987654321');
    });

    test('moderator deve ver telefone completo se for ganhador', () => {
      const phone = '11987654321';
      expect(maskPhone(phone, 'moderator', true)).toBe('11987654321');
    });

    test('moderator deve ver telefone mascarado se não for ganhador', () => {
      const phone = '11987654321';
      expect(maskPhone(phone, 'moderator', false)).toBe('11*******21');
    });

    test('viewer sempre deve ver telefone mascarado', () => {
      const phone = '11987654321';
      expect(maskPhone(phone, 'viewer', true)).toBe('11*******21');
    });

    test('deve retornar "Não informado" para telefone vazio', () => {
      expect(maskPhone('', 'admin')).toBe('Não informado');
      expect(maskPhone(null, 'admin')).toBe('Não informado');
    });

    test('deve mascarar telefones curtos', () => {
      const phone = '123';
      expect(maskPhone(phone, 'viewer')).toBe('***');
    });
  });

  describe('maskEmail', () => {
    test('admin deve ver email completo', () => {
      const email = 'test@example.com';
      expect(maskEmail(email, 'admin')).toBe('test@example.com');
    });

    test('moderator deve ver email completo se for ganhador', () => {
      const email = 'test@example.com';
      expect(maskEmail(email, 'moderator', true)).toBe('test@example.com');
    });

    test('viewer deve ver email mascarado', () => {
      const email = 'test@example.com';
      expect(maskEmail(email, 'viewer')).toBe('t**t@example.com');
    });

    test('deve mascarar emails curtos', () => {
      const email = 'ab@test.com';
      expect(maskEmail(email, 'viewer')).toBe('**@test.com');
    });

    test('deve retornar "Não informado" para email vazio', () => {
      expect(maskEmail('', 'admin')).toBe('Não informado');
    });
  });

  describe('maskName', () => {
    test('admin deve ver nome completo', () => {
      const name = 'João Silva Santos';
      expect(maskName(name, 'admin')).toBe('João Silva Santos');
    });

    test('deve mascarar nome em exibição pública', () => {
      const name = 'João Silva Santos';
      expect(maskName(name, 'moderator', true)).toBe('João S****s');
    });

    test('deve mascarar nome único', () => {
      const name = 'João';
      expect(maskName(name, 'moderator', true)).toBe('J**o');
    });

    test('deve retornar "Não informado" para nome vazio', () => {
      expect(maskName('', 'admin')).toBe('Não informado');
    });
  });

  describe('maskAddress', () => {
    test('admin deve ver endereço completo', () => {
      const address = 'Rua das Flores, 123 - Centro';
      expect(maskAddress(address, 'admin')).toBe('Rua das Flores, 123 - Centro');
    });

    test('não-admin deve ver endereço restrito', () => {
      const address = 'Rua das Flores, 123 - Centro';
      expect(maskAddress(address, 'moderator')).toBe('Endereço restrito');
    });

    test('deve retornar "Não informado" para endereço vazio', () => {
      expect(maskAddress('', 'admin')).toBe('Não informado');
    });
  });

  describe('canViewFullData', () => {
    test('admin pode ver todos os tipos de dados', () => {
      expect(canViewFullData('admin', 'basic')).toBe(true);
      expect(canViewFullData('admin', 'sensitive')).toBe(true);
      expect(canViewFullData('admin', 'financial')).toBe(true);
      expect(canViewFullData('admin', 'audit')).toBe(true);
    });

    test('moderator pode ver dados básicos e sensíveis', () => {
      expect(canViewFullData('moderator', 'basic')).toBe(true);
      expect(canViewFullData('moderator', 'sensitive')).toBe(true);
      expect(canViewFullData('moderator', 'financial')).toBe(false);
      expect(canViewFullData('moderator', 'audit')).toBe(false);
    });

    test('editor pode ver apenas dados básicos', () => {
      expect(canViewFullData('editor', 'basic')).toBe(true);
      expect(canViewFullData('editor', 'sensitive')).toBe(false);
    });

    test('viewer não pode ver dados completos', () => {
      expect(canViewFullData('viewer', 'basic')).toBe(false);
    });
  });

  describe('canExportData', () => {
    test('admin pode exportar dados com PII', () => {
      expect(canExportData('admin', true)).toBe(true);
      expect(canExportData('admin', false)).toBe(true);
    });

    test('moderator pode exportar dados com PII', () => {
      expect(canExportData('moderator', true)).toBe(true);
      expect(canExportData('moderator', false)).toBe(true);
    });

    test('editor pode exportar apenas dados sem PII', () => {
      expect(canExportData('editor', true)).toBe(false);
      expect(canExportData('editor', false)).toBe(true);
    });

    test('viewer pode exportar apenas dados sem PII', () => {
      expect(canExportData('viewer', true)).toBe(false);
      expect(canExportData('viewer', false)).toBe(true);
    });
  });

  describe('maskParticipantData', () => {
    const participant = {
      id: 1,
      nome: 'João Silva',
      telefone: '11987654321',
      email: 'joao@example.com',
      endereco: 'Rua das Flores, 123',
      latitude: -23.550520,
      longitude: -46.633309,
      cidade: 'São Paulo',
      bairro: 'Centro',
      origem_source: 'instagram',
      origem_medium: 'social'
    };

    test('admin deve ver todos os dados', () => {
      const result = maskParticipantData(participant, 'admin');
      expect(result.nome).toBe('João Silva');
      expect(result.telefone).toBe('11987654321');
      expect(result.email).toBe('joao@example.com');
      expect(result.endereco).toBe('Rua das Flores, 123');
      expect(result.latitude).toBe(-23.550520);
      expect(result.longitude).toBe(-46.633309);
    });

    test('moderator deve ver dados mascarados para não-ganhador', () => {
      const result = maskParticipantData(participant, 'moderator', false);
      expect(result.nome).toBe('João S***a');
      expect(result.telefone).toBe('11*******21');
      expect(result.email).toBe('j**o@example.com');
      expect(result.endereco).toBe('Endereço restrito');
      expect(result.latitude).toBe(-23.550520); // moderator pode ver coordenadas
      expect(result.longitude).toBe(-46.633309);
    });

    test('viewer não deve ver coordenadas', () => {
      const result = maskParticipantData(participant, 'viewer');
      expect(result.latitude).toBe(null);
      expect(result.longitude).toBe(null);
      expect(result.cidade).toBe('São Paulo'); // cidade sempre visível
      expect(result.bairro).toBe('Centro');
    });

    test('deve retornar null para participante vazio', () => {
      expect(maskParticipantData(null, 'admin')).toBe(null);
    });
  });

  describe('validateLegalBasis', () => {
    test('deve retornar base legal correta para diferentes propósitos', () => {
      expect(validateLegalBasis('marketing', 'marketing')).toBe('consent');
      expect(validateLegalBasis('contest', 'contest')).toBe('legitimate_interest');
      expect(validateLegalBasis('analytics', 'analytics')).toBe('legitimate_interest');
      expect(validateLegalBasis('audit', 'audit')).toBe('legal_obligation');
      expect(validateLegalBasis('security', 'security')).toBe('vital_interests');
      expect(validateLegalBasis('contract', 'contract')).toBe('contract_performance');
    });

    test('deve retornar consentimento como padrão', () => {
      expect(validateLegalBasis('unknown', 'unknown')).toBe('consent');
    });
  });

  describe('checkDataRetention', () => {
    test('deve indicar que dados recentes devem ser mantidos', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);
      
      const result = checkDataRetention(recentDate.toISOString(), 'participant_data');
      expect(result.shouldRetain).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(700);
    });

    test('deve indicar que dados antigos devem ser removidos', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3); // 3 anos atrás
      
      const result = checkDataRetention(oldDate.toISOString(), 'participant_data');
      expect(result.shouldRetain).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });

    test('deve usar período padrão para tipos desconhecidos', () => {
      const result = checkDataRetention(new Date().toISOString(), 'unknown_type');
      expect(result.shouldRetain).toBe(true);
    });

    test('deve calcular corretamente diferentes períodos de retenção', () => {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 100);
      
      const participantResult = checkDataRetention(testDate.toISOString(), 'participant_data');
      const logsResult = checkDataRetention(testDate.toISOString(), 'logs');
      
      expect(participantResult.shouldRetain).toBe(true); // 2 anos
      expect(logsResult.shouldRetain).toBe(false); // 90 dias
    });
  });
});