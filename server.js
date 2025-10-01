// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// امنیت پایه
app.use(helmet());
app.use(express.json());

// محدودیت درخواست برای جلوگیری از سوءاستفاده
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// تنظیم CORS: در توسعه می‌تونی '*' بذاری، در پروداکشن آدرس سایت خودت رو قرار بده
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*' 
}));

// مسیر ذخیره سفارش‌ها (محلی)
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// helper: append order to local json file (ایمن نگه داشتن فایل .json بر عهده توست)
function saveOrder(order) {
  let arr = [];
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
      arr = raw ? JSON.parse(raw) : [];
    }
  } catch (e) {
    console.error('خطا در خواندن orders.json:', e);
    arr = [];
  }
  arr.push(order);
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    console.error('خطا در نوشتن orders.json:', e);
  }
}

// تنظیم transporter برای ارسال ایمیل
// بهتر است از سرویس‌هایی مثل SendGrid/Mailgun استفاده کنی. اینجا nodemailer با SMTP عمومی ذکر شده.
async function createTransporter() {
  // از متغیرهای محیطی استفاده می‌کنیم
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('SMTP هنوز در .env تنظیم نشده. ایمیل ارسال نخواهد شد.');
    return null;
  }
  const transporter = nodemailer.createTransport({
    host, port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user, pass
    }
  });
  // verify transporter
  try {
    await transporter.verify();
    console.log('SMTP verified');
  } catch (e) {
    console.warn('Warning: SMTP verify failed:', e.message || e);
  }
  return transporter;
}

// POST /api/order
// body: { package: "Bronze"|"Silver"|"Gold", email: "user@example.com" }
app.post('/api/order', async (req, res) => {
  try {
    const { package: pkg, email } = req.body || {};
    if (!pkg || !email) return res.status(400).json({ ok:false, error: 'package و email لازم است' });

    // basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ ok:false, error: 'ایمیل نامعتبر است' });

    // بسته مجاز بررسی
    const allowed = ['Bronze','Silver','Gold'];
    if (!allowed.includes(pkg)) return res.status(400).json({ ok:false, error: 'پکیج نامعتبر' });

    // آماده‌سازی آبجکت سفارش برای ذخیره در سرور
    const order = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      package: pkg,
      email,
      timestamp: new Date().toISOString(),
      contractAddress: process.env.CONTRACT_ADDRESS || null,
      amount: (pkg === 'Bronze' ? '68$' : pkg === 'Silver' ? '112$' : '500$'),
      note: 'پرداخت باید دقیقاً مطابق مبلغ ذکر شده انجام شود'
    };

    // ذخیره محلی
    saveOrder(order);

    // ارسال ایمیل به صاحب سایت
    const transporter = await createTransporter();
    const owner = process.env.OWNER_EMAIL || 'planvestfirst@gmail.com';

    if (transporter) {
      const mailOptions = {
        from: process.env.FROM_EMAIL || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
        to: owner,
        subject: `سفارش جدید پکیج — ${order.package}`,
        text: `
یک سفارش جدید ثبت شد:

پکیج: ${order.package}
مبلغ: ${order.amount}
ایمیل مشتری: ${order.email}
شناسه سفارش: ${order.id}
زمان: ${order.timestamp}

آدرس قرارداد: ${order.contractAddress || '(هنوز تنظیم نشده)'}
تذکر: ${order.note}

(این ایمیل توسط سرور شما ارسال شده)
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Order email sent to owner:', owner);
      } catch (e) {
        console.error('خطا در ارسال ایمیل:', e);
      }
    } else {
      console.warn('SMTP تنظیم نشده — ایمیل ارسال نشد، اما سفارش ذخیره شد.');
    }

    // پاسخ به فرانت‌اند — نکنیم که ایمیل کاربر یا اطلاعات حساس رو به دیگران لو بدیم
    return res.json({ ok:true, message: 'سفارش ثبت شد. ما به زودی با شما تماس خواهیم گرفت.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error: 'خطای سرور' });
  }
});

// endpoint برای بازگردانی سفارش‌ها (اختیاری، محافظت‌شده)
// در حالت ساده ما یک مسیر فقط با توکن ساده می‌سازیم. در پرووداکشن حتماً auth قوی بذار.
app.get('/admin/orders', (req, res) => {
  const adminToken = req.query.token || '';
  if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok:false, error: 'Unauthorized' });
  }
  try {
    const raw = fs.existsSync(ORDERS_FILE) ? fs.readFileSync(ORDERS_FILE, 'utf8') : '[]';
    const arr = raw ? JSON.parse(raw) : [];
    return res.json({ ok:true, orders: arr });
  } catch (e) {
    return res.status(500).json({ ok:false, error: 'خطا در خواندن سفارش‌ها' });
  }
});

// serve static frontend if exists in same folder (optional)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
