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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/admin/static', express.static(require('path').join(__dirname, 'src/views')));

app.get('/health', (req, res) => res.json({ ok: true, message: 'GymNYam backend running' }));

app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/admin', adminRoutes);

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
