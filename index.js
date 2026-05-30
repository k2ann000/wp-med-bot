require('dotenv').config();


const puppeteer = require('puppeteer');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cron = require('node-cron');

// --- UYUMAMASI İÇİN WEB SUNUCUSU (Render.com için) ---
const app = express();
app.get('/', (req, res) => res.send('Aleyna İlaç Botu Çalışıyor!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web sunucusu ${PORT} portunda başlatıldı.`));

// --- WHATSAPP İSTEMCİSİ ---
const client = new Client({
    authStrategy: new LocalAuth(), 
    puppeteer: { 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ] 
    }
});

// --- DEĞİŞKENLER VE ID'LER ---
let isAleynaReplied = false;

const GRUP_ID = process.env.GRUP_ID; 
const ALEYNA_ID = process.env.ALEYNA_ID;

// --- ZAMANLANMIŞ GÖREVLER (CRON JOBS) ---

// 1. Her gece saat 00:00'da durumu sıfırla
cron.schedule('0 0 * * *', () => {
    isAleynaReplied = false;
    console.log('Gece yarısı oldu, ilaç durumu sıfırlandı.');
});

// 2. Her gün 08:00 ile 14:00 arasında, her saat başı çalışır
// cron.schedule('0 8-14 * * *', () => {
//     if (!isAleynaReplied) {
//         client.sendMessage(GRUP_ID, '💊 Günaydın! Aleyna, ilacını içmeyi unutma.');
//         console.log('Hatırlatma mesajı gönderildi.');
//     } else {
//         console.log('Aleyna zaten mesaj attığı için hatırlatma gönderilmedi.');
//     }
// });

// TEST İÇİN GEÇİCİ AYAR: Her dakika başı çalışır ('* * * * *')
cron.schedule('*/10 * * * *', () => {
    if (!isAleynaReplied) {
        client.sendMessage(GRUP_ID, '💊 [TEST] Aleyna, ilacını içmeyi unutma.');
        console.log('Saat başı (test için dakika başı) kontrolü: Hatırlatma mesajı gönderildi.');
    } else {
        console.log('Saat başı (test için dakika başı) kontrolü: Aleyna zaten mesaj attığı için hatırlatma gönderilmedi.');
    }
});

// --- WHATSAPP OLAYLARI (EVENTS) ---

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('\nLütfen yukarıdaki QR kodu okutun.');
});

client.on('ready', () => {
    console.log('\nHarika! Bot başarıyla WhatsApp\'a bağlandı ve çalışmaya hazır.');
});

// Gelen mesajları dinle ve durumu kontrol et
client.on('message', async msg => {
    const sender = msg.author || msg.from; 
    
    // Gelen her mesajı terminale yazdır ki sabah Aleyna'nın ID'sini kolayca bulabilesin
    console.log(`[Gelen Mesaj] Yer: ${msg.from} | Gönderen: ${sender}`);

    // Eğer mesaj belirtilen gruptan ve Aleyna'dan gelmişse
    if (msg.from === GRUP_ID && sender === ALEYNA_ID) {
        isAleynaReplied = true;
        console.log('✅ Aleyna mesaj attı! Bugünkü hatırlatmalar durduruldu.');
    }
});

client.initialize();