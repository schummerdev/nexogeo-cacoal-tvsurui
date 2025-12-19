const { query } = require('./lib/db.js');

async function diagnose() {
  try {
    console.log('🔍 Diagnosticando tabela promocoes...');
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'promocoes'
    `);
    
    console.log('📊 Colunas encontradas:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

    console.log('\n🔍 Diagnosticando tabela audit_logs...');
    const auditResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
    `);
    
    console.log('📊 Colunas audit_logs:');
    auditResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  } finally {
    process.exit();
  }
}

diagnose();
