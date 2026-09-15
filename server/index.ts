import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { GeminiService } from './geminiService';
import { PropertyRepository } from './propertyRepository';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use(express.json());

const repository = new PropertyRepository();
const geminiService = new GeminiService(repository);

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'hubik-real-estate-ai',
    timestamp: new Date().toISOString(),
  });
});

// Main Chat Query endpoint
app.post('/api/chat-query', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({
        error: 'Invalid request: "message" string is required in JSON body.',
      });
      return;
    }

    console.log(`💬 [API] Received chat query: "${message}"`);
    const result = await geminiService.processQuery(message);
    console.log(`✅ [API] Responded with ${result.data.length} properties.`);

    res.json(result);
  } catch (error: any) {
    console.error('❌ [API] Error processing chat query:', error);
    res.status(500).json({
      error: 'Internal server error processing real estate query.',
      details: error?.message,
    });
  }
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 [Server] Real Estate AI API listening on http://localhost:${PORT}`);
    console.log(`📡 [Server] POST /api/chat-query ready`);
  });
}
