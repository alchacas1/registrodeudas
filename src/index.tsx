import express from 'express';
import path from 'path';
import { loadData } from './store';
import apiRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

loadData();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', apiRoutes);

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  DeudaTrack corriendo en http://localhost:${PORT}\n`);
});

export default app;
