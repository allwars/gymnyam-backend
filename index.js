require('dotenv').config();
const express = require('express');
const cors = require('cors');

const userRoutes = require('./src/routes/userRoutes');
const workoutRoutes = require('./src/routes/workoutRoutes');
const mealRoutes = require('./src/routes/mealRoutes');
const pantryRoutes = require('./src/routes/pantryRoutes');
const visionRoutes = require('./src/routes/visionRoutes');
const progressRoutes = require('./src/routes/progressRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const productRoutes = require('./src/routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/admin/static', express.static(require('path').join(__dirname, 'src/views')));

app.get('/health', (req, res) => res.json({ ok: true, message: 'GymNYam backend running' }));

// ── Google OAuth relay ────────────────────────────────────────────────────────
const GOOGLE_WEB_CLIENT_ID     = '635019127213-736epbv9l4tb2bmnurpf37mra9e3pp3s.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_SECRET = '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';
const GOOGLE_REDIRECT_URI      = 'https://gymnyam-backend-production.up.railway.app/auth/google/callback';

app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect('gymnyam://oauth2redirect?error=' + encodeURIComponent(error || 'no_code'));
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_WEB_CLIENT_ID,
        client_secret: GOOGLE_WEB_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const data = await tokenRes.json();
    if (data.access_token) {
      return res.redirect(
        `gymnyam://oauth2redirect?access_token=${encodeURIComponent(data.access_token)}&expires_in=${data.expires_in || 3600}`
      );
    }
    return res.redirect('gymnyam://oauth2redirect?error=' + encodeURIComponent(JSON.stringify(data)));
  } catch (e) {
    return res.redirect('gymnyam://oauth2redirect?error=' + encodeURIComponent(e.message));
  }
});

app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/admin', adminRoutes);
app.use('/api/products', productRoutes);

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'Imagen demasiado grande.' });
  }
  res.status(500).json({ ok: false, error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`GymNYam backend corriendo en http://localhost:${PORT}`);
});
