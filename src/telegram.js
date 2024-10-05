import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

export async function sendTopicMessage(topicId, message) {
  await bot.sendMessage(process.env.TELEGRAM_GROUP_ID, message, {
      message_thread_id: topicId
  });
}