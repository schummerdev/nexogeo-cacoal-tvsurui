CapturaForm.jsx:172 🌍 Solicitando geolocalização...
CapturaForm.jsx:177 ✅ Geolocalização obtida: {latitude: -11.4391972, longitude: -61.4609798, accuracy: 18.295}
CapturaForm.jsx:276 📤 Enviando para a API: {promocao_id: 18, nome: 'maria pedro', telefone: '69987777777', bairro: 'centro', cidade: 'Cacoal', …}
CapturaForm.jsx:277 📤 JSON stringified: {"promocao_id":18,"nome":"maria pedro","telefone":"69987777777","bairro":"centro","cidade":"Cacoal","latitude":-11.4391972,"longitude":-61.4609798,"origem_source":"whatsapp","origem_medium":"messaging"}
CapturaForm.jsx:278 🔍 Validação frontend: {promocao_id: 18, nome: 'maria pedro', telefone: '69987777777', campos_ok: true}
CapturaForm.jsx:287  POST https://nexogeo-cacoal-tvsurui.vercel.app/api/participantes 500 (Internal Server Error)
onSubmit @ CapturaForm.jsx:287
De @ react-dom.production.min.js:54
Be @ react-dom.production.min.js:54
(anônimo) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
Ir @ react-dom.production.min.js:106
(anônimo) @ react-dom.production.min.js:117
cs @ react-dom.production.min.js:274
ze @ react-dom.production.min.js:52
Wr @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Ht @ react-dom.production.min.js:73
CapturaForm.jsx:295 ❌ Erro da API: {success: false, error: 'Handler de participantes não disponível', details: "Unexpected identifier 'http'"}
onSubmit @ CapturaForm.jsx:295
await in onSubmit
De @ react-dom.production.min.js:54
Be @ react-dom.production.min.js:54
(anônimo) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
Ir @ react-dom.production.min.js:106
(anônimo) @ react-dom.production.min.js:117
cs @ react-dom.production.min.js:274
ze @ react-dom.production.min.js:52
Wr @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Ht @ react-dom.production.min.js:73
CapturaForm.jsx:296 📊 Status: 500 
onSubmit @ CapturaForm.jsx:296
await in onSubmit
De @ react-dom.production.min.js:54
Be @ react-dom.production.min.js:54
(anônimo) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
Ir @ react-dom.production.min.js:106
(anônimo) @ react-dom.production.min.js:117
cs @ react-dom.production.min.js:274
ze @ react-dom.production.min.js:52
Wr @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Ht @ react-dom.production.min.js:73



:28:00
17:38:20
17:58:00
Time
Status
Host
Request
Messages
Nov 16 17:57:21.50
POST
500
nexogeo-cacoal-tvsurui.vercel.app
/api/participantes
6
❌ [INDEX] Falha ao recarregar participantesHandler: Unexpected identifier 'http'
Nov 16 17:56:56.01
GET
200
nexogeo-cacoal-tvsurui.vercel.app
/api/promocoes
13
[PUBLIC] Buscando promoção pública por ID: 18
Nov 16 17:56:56.01
GET
200
nexogeo-cacoal-tvsurui.vercel.app
/api/configuracoes
5
✅ [BACKEND] Entrando no bloco type=emissora
Nov 16 17:56:46.57
POST
500
nexogeo-cacoal-tvsurui.vercel.app
/api/participantes
6
❌ [INDEX] Falha ao recarregar participantesHandler: Unexpected identifier 'http'
Nov 16 17:56:42.04
POST
500
nexogeo-cacoal-tvsurui.vercel.app
/api/participantes
15
❌ [INDEX] Falha ao recarregar participantesHandler: Unexpected identifier 'http'
Nov 16 17:52:33.63
POST
500
nexogeo-cacoal-tvsurui.vercel.app
/api/participantes
5
❌ FATAL ERROR in API handler: { message: 'participantesHandler is not a function', stack: 'TypeError: participantesHandler is not a function\n' + ' at Object.handler (/var/task/api/index.js:2035:14)\n' + ' at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' + ' at async r (/opt/rust/nodejs.js:2:15569)\n' + ' at async Server.<anonymous> (/opt/rust/nodejs.js:2:11594)\n' + ' at async Server.<anonymous> (/opt/rust/nodejs.js:16:7750)', url: '/api/participantes?path=participantes', method: 'POST', timestamp: '2025-11-16T21:52:34.685Z' }
Nov 16 17:51:34.93
GET
200
nexogeo-cacoal-tvsurui.vercel.app
/api/promocoes
4
[PUBLIC] Buscando promoção pública por ID: 18
Nov 16 17:51:34.92
GET
200
nexogeo-cacoal-tvsurui.vercel.app
/api/configuracoes
5
✅ [BACKEND] Entrando no bloco type=emissora
Nov 16 17:51:11.07
GET
304
nexogeo-cacoal-tvsurui.vercel.app
/api/
18
🎯 [INDEX-DIRECT] TOTAL: 410 participantes (SEM deduplicacao)
Nov 16 17:51:11.07
GET
200
nexogeo-cacoal-tvsurui.vercel.app
/api/
4
[DASHBOARD] Usuário autenticado para listar promoções: luciano
N


