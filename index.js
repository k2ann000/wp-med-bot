require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cron = require('node-cron');
const { executablePath } = require('puppeteer'); // Yeni eklenen kısım

// --- UYUMAMASI İÇİN WEB SUNUCUSU ---
const app = express();
app.get('/', (req, res) => res.send('Aleyna İlaç Botu Çalışıyor!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web sunucusu ${PORT} portunda başlatıldı.`));

let isAleynaReplied = false;
const GRUP_ID = process.env.GRUP_ID; 
const ALEYNA_ID = process.env.ALEYNA_ID;

// Tüm sistemi async bir fonksiyon içine alıyoruz
async function startBot() {
    // Chrome'un yolunu Promise olarak değil, string olarak bekleyip alıyoruz
    const chromePath = await executablePath(); 

    const client = new Client({
        authStrategy: new LocalAuth(), 
        puppeteer: { 
            executablePath: chromePath, // Artık sorunsuz çalışacak
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

    // --- ZAMANLANMIŞ GÖREVLER ---
    cron.schedule('0 0 * * *', () => {
        isAleynaReplied = false;
        console.log('Gece yarısı oldu, ilaç durumu sıfırlandı.');
    });

    // Şimdilik test için 5 dakikada bir çalışsın
    cron.schedule('*/5 * * * *', () => {
        if (!isAleynaReplied) {
            client.sendMessage(GRUP_ID, '💊 [TEST] Aleyna, ilacını içmeyi unutma.');
            console.log('Hatırlatma mesajı gönderildi.');
        } else {
            console.log('Aleyna mesaj attığı için hatırlatma gönderilmedi.');
        }
    });

    // --- WHATSAPP OLAYLARI ---
    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        console.log('\nLütfen yukarıdaki QR kodu okutun.');
    });

    client.on('ready', () => {
        console.log('\nHarika! Bot başarıyla WhatsApp\'a bağlandı ve çalışmaya hazır.');
    });

    client.on('message', async msg => {
        const sender = msg.author || msg.from; 
        console.log(`[Gelen Mesaj] Yer: ${msg.from} | Gönderen: ${sender}`);

        if (msg.from === GRUP_ID && sender === ALEYNA_ID) {
            isAleynaReplied = true;
            console.log('✅ Aleyna mesaj attı! Bugünkü hatırlatmalar durduruldu.');
        }
    });

    client.initialize();
}

// Botu başlat
startBot();