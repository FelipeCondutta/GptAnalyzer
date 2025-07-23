import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import AccessToken from './models/AccessToken.js';

dotenv.config();

function gerarToken(tamanho = 8) {
  const letrasENumeros = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const especiais = '!@#$%&*';
  let token = '';
  let temEspecial = false;

  for (let i = 0; i < tamanho; i++) {
    if (Math.random() < 0.2) {
      token += especiais.charAt(Math.floor(Math.random() * especiais.length));
      temEspecial = true;
    } else {
      token += letrasENumeros.charAt(Math.floor(Math.random() * letrasENumeros.length));
    }
  }

  if (!temEspecial) {
    const pos = Math.floor(Math.random() * tamanho);
    const especial = especiais.charAt(Math.floor(Math.random() * especiais.length));
    token = token.substring(0, pos) + especial + token.substring(pos + 1);
  }

  return token;
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB conectado.');

    const quantidade = 50;
    const tokens = Array.from({ length: quantidade }).map(() => ({
      token: gerarToken(8),
      used: false
    }));

    await AccessToken.insertMany(tokens);
    console.log(`✅ ${quantidade} tokens inseridos com sucesso.`);
    process.exit();
  })
  .catch(err => console.error('Erro ao conectar MongoDB:', err));