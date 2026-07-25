require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/authRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const environmentRoutes = require('./routes/environmentRoutes');
const executionRoutes = require('./routes/executionRoutes');
const schemaRoutes = require('./routes/schemaRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const ciRoutes = require('./routes/ciRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/schemas', schemaRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/ci', ciRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'API Automation Platform',
    version: '0.1.0',
    phase: 6,
  });
});

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
});
