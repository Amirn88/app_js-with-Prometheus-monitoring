const express = require('express');
const promClient = require('prom-client');
const threadPool = require('threads'); // For worker threads
const app = express();
const port = process.env.PORT || 3000;

// Initialize Prometheus metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Create custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

// Thread pool for handling concurrent requests
const pool = threadPool.Pool(() => 
  threadPool.spawn(new threadPool.Worker('./worker.js')),
  { size: 4 } // 4 worker threads
);

// Middleware to track request metrics
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ 
      method: req.method,
      route: req.route?.path || req.path,
      code: res.statusCode
    });
  });
  next();
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Main endpoint with thread support
app.get('/', async (req, res) => {
  await pool.queue(async (worker) => {
    const result = await worker.processRequest();
    res.send(`Hello from Node.js App on Kubernetes! ${result}`);
  });
});

// Thread worker endpoint
app.post('/threads', async (req, res) => {
  await pool.queue(async (worker) => {
    const result = await worker.heavyComputation();
    res.json({ result });
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
  console.log(`Metrics at http://localhost:${port}/metrics`);
});