const jwt = require('jsonwebtoken');
const { query } = require('../../lib/db.js');

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
    let token = null;

    // 🔐 SEGURANÇA: Ler token do HttpOnly cookie primeiro (mais seguro)
    // Cookies são enviados automaticamente pelo browser com credentials: 'include'
    if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
      console.log('[AUTH] 🔐 Token lido do HttpOnly cookie (req.cookies)');
    }
    // Em Vercel, req.cookies pode não estar populado, então parsear do header manualmente
    else if (req.headers.cookie) {
      const cookieString = req.headers.cookie;
      const cookies = cookieString.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          acc[name] = decodeURIComponent(value);
        }
        return acc;
      }, {});
      if (cookies.authToken) {
        token = cookies.authToken;
        console.log('[AUTH] 🔐 Token lido do header cookie (parsed)');
      }
    }
    // Fallback para Authorization header (compatibilidade)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
      console.log('[AUTH] 🔓 Token lido do Authorization header');
    }

    if (!token) {
      console.log('[AUTH] ⚠️ Nenhum token encontrado. Cookies disponíveis:', {
        hasCookiesObj: !!req.cookies,
        hasCookieHeader: !!req.headers.cookie,
        cookieHeader: req.headers.cookie ? req.headers.cookie.substring(0, 50) + '...' : 'nenhum'
      });
      throw new Error('Token de autenticação não fornecido');
    }

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
