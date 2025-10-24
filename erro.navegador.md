


AdminDashboardPage.jsx:176  GET https://nexogeo-demo.vercel.app/api/?route=promocoes 500 (Internal Server Error)
E @ AdminDashboardPage.jsx:176
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
AdminDashboardPage.jsx:173  GET https://nexogeo-demo.vercel.app/api/?route=dashboard 500 (Internal Server Error)
E @ AdminDashboardPage.jsx:173
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
AdminDashboardPage.jsx:179  GET https://nexogeo-demo.vercel.app/api/?route=dashboard&action=participantes-por-promocao 500 (Internal Server Error)
E @ AdminDashboardPage.jsx:179
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
AdminDashboardPage.jsx:182  GET https://nexogeo-demo.vercel.app/api/?route=dashboard&action=origem-cadastros&promocao_id=todas 500 (Internal Server Error)
E @ AdminDashboardPage.jsx:182
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
AdminDashboardPage.jsx:287  GET https://nexogeo-demo.vercel.app/api/caixa-misteriosa/stats/participation 500 (Internal Server Error)
E @ AdminDashboardPage.jsx:287
await in E
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
AdminDashboardPage.jsx:322  GET https://nexogeo-demo.vercel.app/api/caixa-misteriosa/stats/new-registrations 500 (Internal Server Error)
E @ AdminDashboardPage.jsx:322
await in E
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
auditService.js:22 🔍 Tentando registrar log de auditoria: {url: '/api/?route=audit&action=log', payload: {…}}
AdminDashboardPage.jsx:357 🔐 Visualização do dashboard auditada
auditService.js:24  POST https://nexogeo-demo.vercel.app/api/?route=audit&action=log 500 (Internal Server Error)
l @ auditService.js:24
viewDashboard @ auditService.js:395
E @ AdminDashboardPage.jsx:356
await in E
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
auditService.js:34 ❌ Erro ao registrar log de auditoria: 500 
l @ auditService.js:34
await in l
viewDashboard @ auditService.js:395
E @ AdminDashboardPage.jsx:356
await in E
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14
auditService.js:36 ❌ Detalhes do erro: A server error has occurred

FUNCTION_INVOCATION_FAILED

gru1::8mpfn-1761273833490-8db154b0476d

l @ auditService.js:36
await in l
viewDashboard @ auditService.js:395
E @ AdminDashboardPage.jsx:356
await in E
(anonymous) @ AdminDashboardPage.jsx:104
au @ react-dom.production.min.js:244
Ss @ react-dom.production.min.js:286
(anonymous) @ react-dom.production.min.js:282
x @ scheduler.production.min.js:13
T @ scheduler.production.min.js:14



esta chamando o link errado...
https://nexogeo-demo.vercel.app/dashboard/promocoes

correto seria
https://nexogeo-demo.vercel.app/promocoes

na pasta local esta funcionando mas no vercel esta com esse erro 

analisar


