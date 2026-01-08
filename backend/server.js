const express = require('express');
const cors = require('cors');
const { configurations, runConfigsSequential } = require('./benchmarks/configs');

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/configurations -> list available configurations
app.get('/api/configurations', (req, res) => {
  res.json({ configurations });
});

// POST /api/run -> { configs: ['js_inline', 'wasm_rust', ...] }
// Runs the requested configs sequentially and returns results
app.post('/api/run', async (req, res) => {
  const { configs } = req.body || {};
  if (!configs || !Array.isArray(configs) || configs.length === 0) {
    return res.status(400).json({ error: 'Please provide configs: ["id1","id2"]' });
  }

  try {
    const results = await runConfigsSequential(configs);
    res.json(results);
  } catch (err) {
    console.error('Error running configs:', err);
    res.status(500).json({ error: err.message || 'internal' });
  }
});

const PORT = process.env.BENCH_SERVER_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Bench server listening on port ${PORT}`);
});
