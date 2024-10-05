import express from 'express';
import { sendTopicMessage } from './telegram.js';

const app = express();
const port = 9999;

app.use(express.json());

app.post('/submit', async (req, res) => {
  const { channel } = req.query;
  const { reportString, reportType } = req.body;

  if (!channel || !reportString) {
    return res.status(400).json({ error: 'Missing channel or reportString' });
  }

  let typeEmojis = {
    runtimeError: '🔥',
    info: 'ℹ️',
    docker: '🐳',
    linux: '🐧',
    userMessage: '💬',
  }

  try {
    await sendTopicMessage(channel, `${typeEmojis[reportType] || ''} ${reportString}`);
    res.status(200).send('Report submitted');
  } catch (error) {
    console.error('Report processing runtime error:', error);
    res.status(500).send('Internal report server error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

