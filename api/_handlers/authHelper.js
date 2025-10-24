const jwt = require('jsonwebtoken');
const { query } = require('../lib/db.js');

// Verificar se JWT_SECRET existe
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Helper function to get authenticated user and check roles
 * @param {object} req - The request object from the handler.
 * @param {string[]} [allowedRoles=[]] - Optional array of roles that are allowed to access the endpoint.
 * @returns {Promise<object>} The user object from the database.
 * @throws {Error} Throws an error if authentication or authorization fails.
 */
async function getAuthenticatedUser(req, allowedRoles = []) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autenticação não fornecido');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token is valid, now get user from DB to ensure they still exist and get their role
    const userResult = await query('SELECT id, usuario, role FROM usuarios WHERE id = $1', [decoded.id]);
    
    if (userResult.rows.length === 0) {
      throw new Error('Usuário do token não encontrado no sistema.');
    }
    
    const user = userResult.rows[0];
    
    // If specific roles are required, check them
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // 🔐 SEGURANÇA: Log sanitizado - não expõe usuário completo
      console.log(`🚫 Falha na autorização: role ${user.role} tentou acessar rota para roles: ${allowedRoles.join(', ')}`);
      throw new Error('Acesso não autorizado para esta funcionalidade.');
    }

    // 🔐 SEGURANÇA: Log sanitizado apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Usuário autenticado: ${user.usuario.substring(0, 3)}*** (Role: ${user.role})`);
    }
    return user; // Return the full user object

  } catch (error) {
    // Log the original error for debugging, but throw a generic one
    console.log('❌ Erro de autenticação/autorização:', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new Error('Token inválido ou expirado');
    }
    throw error; // Re-throw other errors (like DB connection issues or custom auth errors)
  }
}

module.exports = { getAuthenticatedUser };
