const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 8080;

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// OpenAI proxy
if (process.env.OPENAI_API_KEY) {
  app.use('/openai', createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
    pathRewrite: { '^/openai': '' },
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_KEY}`);
    },
    onError: (err, req, res) => {
      console.error('OpenAI Proxy Error:', err);
      res.status(500).json({ error: 'Proxy error' });
    }
  }));
  console.log('OpenAI proxy configured at /openai');
}

// Anthropic proxy
if (process.env.ANTHROPIC_API_KEY) {
  app.use('/anthropic', createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: { '^/anthropic': '' },
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('x-api-key', process.env.ANTHROPIC_API_KEY);
      proxyReq.setHeader('anthropic-version', '2023-06-01');
    },
    onError: (err, req, res) => {
      console.error('Anthropic Proxy Error:', err);
      res.status(500).json({ error: 'Proxy error' });
    }
  }));
  console.log('Anthropic proxy configured at /anthropic');
}

// HuggingFace proxy
if (process.env.HUGGINGFACE_TOKEN) {
  app.use('/huggingface', createProxyMiddleware({
    target: 'https://api-inference.huggingface.co',
    changeOrigin: true,
    pathRewrite: { '^/huggingface': '' },
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${process.env.HUGGINGFACE_TOKEN}`);
    },
    onError: (err, req, res) => {
      console.error('HuggingFace Proxy Error:', err);
      res.status(500).json({ error: 'Proxy error' });
    }
  }));
  console.log('HuggingFace proxy configured at /huggingface');
}

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'LLPM API Proxy',
    endpoints: {
      health: '/health',
      openai: process.env.OPENAI_API_KEY ? '/openai/*' : 'Not configured',
      anthropic: process.env.ANTHROPIC_API_KEY ? '/anthropic/*' : 'Not configured',
      huggingface: process.env.HUGGINGFACE_TOKEN ? '/huggingface/*' : 'Not configured'
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Proxy server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  - Health check: /health');
  if (process.env.OPENAI_API_KEY) console.log('  - OpenAI: /openai/*');
  if (process.env.ANTHROPIC_API_KEY) console.log('  - Anthropic: /anthropic/*');
  if (process.env.HUGGINGFACE_TOKEN) console.log('  - HuggingFace: /huggingface/*');
});