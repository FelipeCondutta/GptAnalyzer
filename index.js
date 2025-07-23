import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import nodemailer from 'nodemailer';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import mongoose from 'mongoose';
import AccessToken from './models/AccessToken.js';
import UsedToken from './models/UsedToken.js';

   mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB conectado!'))
  .catch(err => console.error('Erro ao conectar MongoDB:', err));



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


   app.post('/upload', validateAccessToken, upload.single('pdf'), async (req, res, next) => {
  try {
    const email = req.body.email;
    if (!req.file || !email) {
      return res.status(400).json({ error: 'Arquivo PDF e email são obrigatórios.' });
    }
    
    const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf8');
    const descricao = req.body.descricao;
    const dataBuffer = await pdfParse(req.file.buffer);
    const pdfText = dataBuffer.text;

    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const nomeResult = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `Com base no conteúdo abaixo, retorne apenas o nome completo do candidato de forma direta, sem explicações:\n\n${pdfText}`
      }]
    });

    let nomeUsuario = nomeResult.choices[0].message.content.trim();
    if (nomeUsuario.length > 60 || nomeUsuario.includes('\n')) {
      nomeUsuario = "Candidato(a)";
    }

    const prompt = promptTemplate
  .replace(/{{nomeUsuario}}/g, nomeUsuario)
  .replace(/{{pdfText}}/g, pdfText)
  .replace(/{{descricao}}/g, descricao);

    const feedbackResult = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    let feedback = feedbackResult.choices[0].message.content;

    

    feedback = feedback
      .replace(/Olá, (.*?)! Que bom te ver por aqui!/i, '👋 Olá, $1! Que bom te ver por aqui!')
      .replace(/## GREETING AND MARKET OVERVIEW/gi, '💡 Visão Geral e Boas-Vindas')
      .replace(/## PROFILE DIAGNOSIS/gi, '📊 Diagnóstico do Perfil')
      .replace(/## PROFESSIONAL PROFILE REWRITING/gi, '🧠 Reescrita do Perfil Profissional')
      .replace(/## ADVANCED KEYWORD OPTIMIZATION/gi, '🔍 Otimização de Palavras-Chave')
      .replace(/## COMPETITOR ANALYSIS/gi, '🏁 Análise de Concorrência')
      .replace(/## ADDITIONAL CONTENT SUGGESTIONS/gi, '📌 Sugestões de Conteúdo')
      .replace(/## PERSONALIZED COVER LETTER REVIEW/gi, '✉️ Análise da Carta de Apresentação')
      .replace(/## INTERVIEW SIMULATION/gi, '🎤 Simulação de Entrevista')
      .replace(/## CONTACT NETWORK ANALYSIS/gi, '🔗 Estratégia de Networking')
      .replace(/## BLOCK 3: APPLICATION SUPPORT MATERIALS/gi, '📁 Materiais de Apoio à Candidatura');

    // CONVERSÃO DE MARKDOWN PARA HTML 
    const htmlContentFromMarkdown = marked(feedback);
    const imageBuffer = fs.readFileSync(path.join(__dirname, 'assets', 'HeyKodee.png'));
    const imageBase64 = imageBuffer.toString('base64');

    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
    <meta charset="utf-8">
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Noto+Color+Emoji&display=swap');

    body {
      font-family: 'Roboto', 'Noto Color Emoji', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      padding: 30px 15px;
      color: #000;
      background-color: #fff;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #000;
      font-weight: bold;
      margin-top: 24pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }

    h1 {
      font-size: 16pt;
      margin-top: 24pt;
      margin-bottom: 12pt;
      text-align: center;
      border-bottom: none;
      padding-bottom: 0;
    }
    h2 {
      font-size: 13pt;
      margin-top: 20pt;
      margin-bottom: 12pt;
    }
    h3 {
      font-size: 11pt;
      margin-top: 16pt;
      margin-bottom: 10pt;
    }
    h4, h5, h6 {
      font-size: 11pt;
      margin-top: 14pt;
      margin-bottom: 10pt;
    }

    p {
      margin-top: 10pt;
      margin-bottom: 0;
      text-align: justify;
      font-size: 11pt;
      line-height: 1.3;
    }

    ul, ol {
      margin-left: 25px;
      margin-bottom: 10pt;
      padding: 0;
      font-size: 11pt;
      line-height: 1.3;
    }

    ul li, ol li {
      margin-bottom: 5pt;
    }

    strong { font-weight: bold; }
    em { font-style: italic; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14pt;
      box-shadow: 0 0 5px rgba(0,0,0,0.1);
      font-size: 11pt;
      line-height: 1.3;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8pt 10pt;
      text-align: left;
    }

    th {
      background-color: #f8f8f8;
      font-weight: bold;
      color: #555;
    }

    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    a {
      color: #000;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    section {
      page-break-inside: avoid;
      margin-top: 24pt;
      margin-bottom: 24pt;
    }

    .centered-title {
      text-align: center;
      font-weight: bold;
    }

    </style>
    </head>
    <body>

    <!-- CAPA -->
    <div class="centered-title" style="margin-top: 150px;">
      <img src="data:image/png;base64,${imageBase64}" alt="HeyKodee Logo" style="width: 300px; margin: 20px auto; display: block;" />
      <h1>Feedback Profissional</h1>
      <p style="text-align: center; font-size: 13pt;"><strong>${nomeUsuario}</strong></p>
      <p style="text-align: center; font-size: 11pt;">${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <!-- Conteúdo Gerado - Estruturado em Seções -->
    <section>
    ${htmlContentFromMarkdown}
    </section>

    </body>
    </html>
    `;


    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(__dirname, `feedback_${Date.now()}.pdf`);
    await page.pdf({
  path: pdfPath,
  format: 'A4',
  margin: {
    top: '25mm',      
    bottom: '25mm',   
    left: '25mm',
    right: '25mm'
  },
  printBackground: true
});
    await browser.close();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Kodee" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '📝 Seu feedback profissional chegou!',
      text: `Olá, ${nomeUsuario}!

Sabemos que pensar sobre carreira pode ser solitário às vezes. Mas aqui vai um lembrete importante: você não está sozinho(a). E esse passo que você deu agora — de buscar uma análise profunda do seu perfil — mostra coragem e visão.

📎 Em anexo, você vai encontrar sua análise personalizada — feita com todo o cuidado pela Kodee. É um retrato estratégico do seu currículo ou perfil no LinkedIn, pensado para te ajudar a se posicionar com mais impacto no mercado.

🧠 Ah, um lembrete amigo: A Kodee é movida por inteligência artificial (sim, tipo o ChatGPT!). Ela é brilhante, mas como todo mundo, às vezes pode escorregar. Se alguma informação parecer confusa ou você quiser uma segunda opinião, vale revisar com um olhar humano também.😉


💬E depois da análise, o que vem?

Bom, talvez surjam dúvidas. Talvez você queira conversar sobre possibilidades, caminhos, decisões. Se for o caso, temos algo especial pra você:

💡Sessão de Mentoria Estratégica com um dos nossos especialistas É um bate-papo individual, focado em você — para transformar essa análise em um plano concreto de ação profissional.

👉 <a href:'https://google.com'>Agendar minha mentoria</a>


Se sentir que precisa de ajuda, estamos aqui. Nosso e-mail: [suporte@heykodee.com.br] Nossa missão: te ajudar a chegar mais longe.

Com carinho, Equipe Hey, Kodee`,
      attachments: [
        {
          filename: 'feedback.pdf',
          path: pdfPath,
        },
      ],
    });

    fs.unlinkSync(pdfPath);
    res.json({ message: 'Feedback gerado e enviado com sucesso!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.post('/validate-token', async (req, res) => {
  try {
    const token = req.body.token || req.headers['x-access-token'];
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token não informado.' });
    }
    const foundToken = await AccessToken.findOne({ token, used: false });
    if (!foundToken) {
      return res.status(200).json({ valid: false, error: 'Token inválido ou já utilizado.' });
    }
    return res.status(200).json({ valid: true, message: 'Token válido e disponível para uso.' });
  } catch (err) {
    console.error('Erro ao validar token:', err);
    return res.status(500).json({ valid: false, error: 'Erro interno ao validar token.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});



//Middleware de validação de token padrão sem a logica do models/UsedToken.js,

// async function validateAccessToken(req, res, next) {
//   const token = req.headers['x-access-token'] || req.body.token;

//   if (!token) return res.status(401).json({ error: 'Token de acesso não informado.' });

//   const foundToken = await AccessToken.findOne({ token });

//   if (!foundToken) return res.status(403).json({ error: 'Token inválido.' });

//   next();
// }


//Middleware de validação de token com o models/UsedToken.js

async function validateAccessToken(req, res, next) {
  const token = req.headers['x-access-token'] || req.body.token;
  if (!token) return res.status(401).json({ error: 'Token de acesso não informado.' });

  const foundToken = await AccessToken.findOne({ token, used: false });
  if (!foundToken) return res.status(403).json({ error: 'Token inválido ou já utilizado.' });

  foundToken.used = true;
  await foundToken.save();

  await UsedToken.create({
    token: foundToken.token,
    email: req.body.email || 'não informado'
  });

  next();
  console.log('✅ Token atualizado para "used: true":', foundToken.token);
  console.log('✅ Token movido para coleção usedtokens');
}

// Webhook para receber notificações da Eduzz e enviar o token por email
app.post('/api/webhook-eduzz', async (req, res) => {
  try {
    console.log('BODY RECEBIDO:', JSON.stringify(req.body, null, 2));

    const buyer_email = req.body?.cus_email?.toLowerCase() || null;
    const buyer_name = req.body?.cus_name || null;
    const event_name = req.body?.event_name || null;
    const trans_status = req.body?.trans_status || null;
    const trans_cod = req.body?.trans_cod?.toString();

    if (!trans_cod) {
  console.warn('Webhook ignorado: trans_cod ausente.');
  return res.status(200).json({ message: 'Webhook ignorado sem trans_cod.' });
}

// Verifica se esse trans_cod já foi usado
const jaEnviado = await AccessToken.findOne({ trans_cod });

if (jaEnviado) {
  console.warn(`Transação ${trans_cod} já processada para ${jaEnviado.email}`);
  return res.status(200).json({ message: 'Transação já processada anteriormente.' });
}

// Verifica se é o evento certo e se o pagamento foi confirmado
if (
  !buyer_email ||
  !buyer_name ||
  buyer_email.includes('@eduzz.com') ||
  event_name !== 'invoice_paid' ||
  trans_status !== 3
) {
  console.warn('Webhook ignorado: dados incompletos ou pagamento não confirmado.');
  return res.status(200).json({ message: 'Webhook ignorado com sucesso.' });
}
    
    const tokenDisponivel = await AccessToken.findOne({ used: false });

    if (!tokenDisponivel) {
      console.error('Sem tokens disponíveis.');
      return res.status(500).json({ error: 'Nenhum token disponível no momento.' });
    }
 
    tokenDisponivel.email = buyer_email;
    tokenDisponivel.used = true;
    tokenDisponivel.trans_cod = trans_cod;
    await tokenDisponivel.save();


    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: buyer_email,
      subject: 'Sua chave de acesso ao Bot de Análise de Currículo',
      text: `Olá ${buyer_name},

Obrigado pela sua compra!

Aqui está sua chave de acesso ao Bot:

🔑 CHAVE: ${tokenDisponivel.token}

Use-a na nossa plataforma para acessar seu bot.

Atenciosamente,
Equipe Hey Kodee`
    };

    await transporter.sendMail(mailOptions);

    console.log(`Token ${tokenDisponivel.token} enviado para ${buyer_email}`);

    return res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso.'
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

