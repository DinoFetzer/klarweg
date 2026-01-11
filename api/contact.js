const nodemailer = require('nodemailer');

function parseBody(req) {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body;
  }

  if (!req.body) {
    return {};
  }

  try {
    return JSON.parse(req.body);
  } catch (err) {
    return {};
  }
}

function isValidLength(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length > 200) return false;
  const pattern = /^[\w.!#$%&'*+/=?`{|}~-]+@[\w-]+(?:\.[\w-]+)+$/;
  return pattern.test(email.trim());
}

module.exports = async (req, res) => {
  res.setHeader('Allow', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const data = parseBody(req);
  const name = data.name?.trim();
  const email = data.email?.trim();
  const topic = data.topic?.trim();
  const message = data.message?.trim();
  const website = data.website?.trim();

  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!isValidLength(name, 2, 120)) {
    return res.status(400).json({ ok: false, error: 'Ungültiger Name' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Ungültige E-Mail' });
  }

  if (!isValidLength(topic, 1, 80)) {
    return res.status(400).json({ ok: false, error: 'Ungültiges Thema' });
  }

  if (!isValidLength(message, 10, 4000)) {
    return res.status(400).json({ ok: false, error: 'Ungültige Nachricht' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO || !MAIL_FROM) {
    return res.status(500).json({ ok: false, error: 'Server configuration error' });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const now = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unbekannt';

  const mailOptions = {
    from: MAIL_FROM,
    to: MAIL_TO,
    replyTo: email,
    subject: `Klarweg Kontakt: ${topic} – ${name}`,
    text: `Neue Kontaktanfrage von klarweg.online\n\nName: ${name}\nE-Mail: ${email}\nThema: ${topic}\nNachricht:\n${message}\n\nZeitpunkt: ${now}\nIP: ${clientIp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Kontaktformular Fehler:', error.message);
    return res.status(500).json({ ok: false, error: 'E-Mail konnte nicht gesendet werden' });
  }
};
