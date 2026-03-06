
const { google } = require('googleapis');
const formidable = require('formidable');
const fs = require('fs');

// Configuração da autenticação Google Drive
// Requer Service Account: GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY
const getDriveService = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // Corrige quebras de linha na key (comum em env vars)
    const key = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

    if (!email || !key) {
        throw new Error('Credenciais do Google Drive (Service Account) não configuradas.');
    }

    const auth = new google.auth.JWT(
        email,
        null,
        key,
        ['https://www.googleapis.com/auth/drive.file']
    );

    return google.drive({ version: 'v3', auth });
};

// ID da pasta no Drive onde as imagens serão salvas
// Se não definido, salva na raiz
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

module.exports = async (req, res) => {
    // Apenas método POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método não permitido.' });
    }

    try {
        // Verifica credenciais antes de processar upload
        try {
            getDriveService();
        } catch (authError) {
            console.error('Erro de configuração Google Drive:', authError.message);
            return res.status(500).json({
                success: false,
                message: 'Erro de configuração do servidor de upload: Credenciais ausentes.'
            });
        }

        // Configura form parser para Vercel/Node normal
        // Desativa bodyParser padrão do Next.js/Vercel se necessário, mas aqui estamos em func pura
        // Nota: Em Vercel functions, req já é um IncomingMessage, formidable funciona bem.

        const form = formidable({
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024, // 5MB limit
        });

        // Promise wrapper para formidable
        const parseForm = () => new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        console.log('📤 Iniciando upload para Google Drive...');

        const { fields, files } = await parseForm();

        // Verifica se veio arquivo. O nome do campo no front deve ser 'file' ou 'image'
        const file = files.file || files.image || Object.values(files)[0];

        if (!file) {
            // Em formidables mais novos, file pode ser um array se multiplos, ou o objeto.
            // Se for array:
            if (Array.isArray(file) && file.length === 0) {
                return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
            }
            if (!file && (!files || Object.keys(files).length === 0)) {
                return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
            }
        }

        const fileToUpload = Array.isArray(file) ? file[0] : file;

        const drive = getDriveService();

        const fileMetadata = {
            name: `promo_${Date.now()}_${fileToUpload.originalFilename || 'image.jpg'}`,
            parents: FOLDER_ID ? [FOLDER_ID] : undefined,
        };

        const media = {
            mimeType: fileToUpload.mimetype,
            body: fs.createReadStream(fileToUpload.filepath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Configura permissão pública para leitura (opcional, dependendo se a pasta já é publica)
        // Se a pasta já for pública, não precisa. Mas vamos garantir.
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Limpa arquivo temporário
        try {
            fs.unlinkSync(fileToUpload.filepath);
        } catch (e) { /* ignore */ }

        console.log(`✅ Upload concluído: ${response.data.id}`);

        // O webContentLink geralmente força download. webViewLink abre visualizador.
        // Para usar como imagem direta (src), precisaria de um truque de ID, 
        // ou usar 'https://drive.google.com/uc?export=view&id=FILE_ID'
        const directLink = `https://drive.google.com/uc?export=view&id=${response.data.id}`;

        res.status(200).json({
            success: true,
            fileId: response.data.id,
            url: directLink,
            viewLink: response.data.webViewLink
        });

    } catch (error) {
        console.error('❌ Erro no upload:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao fazer upload da imagem.',
            error: error.message
        });
    }
};

// Configuração para Vercel: desativar body parsing automático para formidable funcionar
module.exports.config = {
    api: {
        bodyParser: false,
    },
};
