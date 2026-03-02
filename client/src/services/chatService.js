import api from './api.js';

export async function sendMessage(message, portfolio, history) {
  try {
    const { data } = await api.post('/api/chat', { message, portfolio, history });
    return data.reply;
  } catch (err) {
    // Server returns a helpful reply even on errors like missing API key
    if (err.response?.data?.reply) {
      return err.response.data.reply;
    }
    throw err;
  }
}
