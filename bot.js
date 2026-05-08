const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==================
// GEMINI SETUP
// ==================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ==================
// WHATSAPP CLIENT
// ==================
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
        ],
        headless: true
    }
});

let botStatus = 'starting';

// ==================
// WEBPAGE
// ==================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Gemini Bot</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Arial, sans-serif;
            background: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        .logo { font-size: 50px; margin-bottom: 10px; }
        h2 { color: #128C7E; margin-bottom: 5px; }
        p { color: #666; font-size: 14px; margin-bottom: 20px; }
        input {
            width: 100%;
            padding: 12px 15px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 10px;
            margin-bottom: 12px;
            outline: none;
            transition: border 0.3s;
        }
        input:focus { border-color: #25D366; }
        button {
            width: 100%;
            padding: 13px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        }
        button:hover { background: #128C7E; }
        button:disabled { background: #aaa; cursor: not-allowed; }
        #result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            display: none;
        }
        .success {
            background: #e8f5e9;
            border: 2px solid #25D366;
        }
        .error {
            background: #fdecea;
            border: 2px solid #e53935;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            color: #128C7E;
            letter-spacing: 6px;
            margin: 10px 0;
        }
        .hint { font-size: 13px; color: #555; margin-top: 8px; }
        .status-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .status-ready { background: #e8f5e9; color: #2e7d32; }
        .status-starting { background: #fff3e0; color: #e65100; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">🤖</div>
        <h2>WhatsApp Gemini Bot</h2>
        <div id="statusBadge" class="status-badge status-starting">⏳ Starting...</div>
        <p>നിങ്ങളുടെ WhatsApp number ഇടുക<br>(Country code സഹിതം)</p>
        <input
            type="tel"
            id="phone"
            placeholder="919876543210"
            maxlength="15"
        />
        <button id="btn" onclick="getPairingCode()">🔢 Pairing Code എടുക്കുക</button>
        <div id="result">
            <p id="resultMsg"></p>
            <div class="code" id="codeDisplay"></div>
            <p class="hint" id="hintMsg"></p>
        </div>
    </div>

    <script>
        async function checkStatus() {
            try {
                const res = await fetch('/status');
                const data = await res.json();
                const badge = document.getElementById('statusBadge');
                if (data.status === 'ready') {
                    badge.className = 'status-badge status-ready';
                    badge.innerText = '✅ Bot Ready';
                } else {
                    badge.className = 'status-badge status-starting';
                    badge.innerText = '⏳ Starting...';
                }
            } catch(e) {}
        }

        checkStatus();
        setInterval(checkStatus, 5000);

        async function getPairingCode() {
            const phone = document.getElementById('phone').value.trim();
            if (!phone) { alert('Phone number ഇടുക!'); return; }
            if (phone.length < 10) { alert('Valid number ഇടുക!'); return; }

            const btn = document.getElementById('btn');
            btn.disabled = true;
            btn.innerText = '⏳ Loading...';

            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'none';

            try {
                const res = await fetch('/pair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const data = await res.json();

                resultDiv.style.display = 'block';

                if (data.code) {
                    resultDiv.className = 'success';
                    document.getElementById('resultMsg').innerText = '🎉 നിങ്ങളുടെ Pairing Code:';
                    document.getElementById('codeDisplay').innerText = data.code;
                    document.getElementById('hintMsg').innerText = 'WhatsApp → Linked Devices → Link with Phone Number → ഈ code ഇടുക';
                } else {
                    resultDiv.className = 'error';
                    document.getElementById('resultMsg').innerText = '❌ Error!';
                    document.getElementById('codeDisplay').innerText = '';
                    document.getElementById('hintMsg').innerText = data.error || 'വീണ്ടും try ചെയ്യുക';
                }
            } catch (err) {
                resultDiv.style.display = 'block';
                resultDiv.className = 'error';
                document.getElementById('resultMsg').innerText = '❌ Server Error!';
                document.getElementById('codeDisplay').innerText = '';
                document.getElementById('hintMsg').innerText = 'വീണ്ടും try ചെയ്യുക';
            }

            btn.disabled = false;
            btn.innerText = '🔢 Pairing Code എടുക്കുക';
        }

        document.getElementById('phone').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') getPairingCode();
        });
    </script>
</body>
</html>
    `);
});

// ==================
// API ROUTES
// ==================
app.get('/status', (req, res) => {
    res.json({ status: botStatus });
});

app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.json({ error: 'Phone number വേണം!' });
    try {
        const code = await client.requestPairingCode(phone);
        console.log(`🔢 Pairing code: ${phone} → ${code}`);
        res.json({ code });
    } catch (err) {
        console.error('Pairing error:', err.message);
        res.json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));

// ==================
// WHATSAPP EVENTS
// ==================
client.on('qr', () => {
    console.log('⏳ Bot starting - Webpage-ൽ pairing code use ചെയ്യുക');
});

client.on('ready', () => {
    botStatus = 'ready';
    console.log('✅ WhatsApp Bot Ready!');
});

client.on('auth_failure', () => {
    botStatus = 'auth_failed';
    console.log('❌ Auth failed! വീണ്ടും try ചെയ്യുക.');
});

client.on('disconnected', (reason) => {
    botStatus = 'disconnected';
    console.log('⚠️ Disconnected:', reason);
    setTimeout(() => client.initialize(), 5000);
});

// ==================
// MESSAGE HANDLER
// ==================
client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return;
    if (msg.from === 'status@broadcast') return;

    console.log(`📩 ${msg.from}: ${msg.body}`);

    try {
        const result = await model.generateContent(msg.body);
        const reply = result.response.text();
        console.log(`🤖 Reply sent`);
        msg.reply(reply);
    } catch (error) {
        console.error('❌ Gemini Error:', error);
        msg.reply('Sorry, ഒരു error വന്നു. വീണ്ടും try ചെയ്യൂ! 😕');
    }
});

client.initialize();
