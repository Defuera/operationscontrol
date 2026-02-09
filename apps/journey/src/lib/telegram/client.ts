const TELEGRAM_API = 'https://api.telegram.org/bot';

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return token;
}

export async function sendMessage(chatId: number, text: string, options?: {
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: unknown;
}): Promise<void> {
  const response = await fetch(`${TELEGRAM_API}${getToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      reply_markup: options?.replyMarkup,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Telegram sendMessage error:', error);
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  const apiUrl = `${TELEGRAM_API}${getToken()}/setWebhook`;
  console.log('Setting webhook to:', url);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();
  console.log('setWebhook response:', JSON.stringify(data, null, 2));
  return data.ok;
}

export async function getWebhookInfo(): Promise<unknown> {
  const response = await fetch(`${TELEGRAM_API}${getToken()}/getWebhookInfo`);
  return response.json();
}

export async function deleteWebhook(): Promise<boolean> {
  const response = await fetch(`${TELEGRAM_API}${getToken()}/deleteWebhook`, {
    method: 'POST',
  });

  const data = await response.json();
  return data.ok;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    date: number;
    text?: string;
    voice?: {
      file_id: string;
      file_unique_id: string;
      duration: number;
      mime_type?: string;
      file_size?: number;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    message?: {
      message_id: number;
      chat: { id: number };
    };
    data?: string;
  };
}

export async function getFileUrl(fileId: string): Promise<string> {
  const response = await fetch(`${TELEGRAM_API}${getToken()}/getFile?file_id=${fileId}`);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Failed to get file: ${data.description}`);
  }

  return `https://api.telegram.org/file/bot${getToken()}/${data.result.file_path}`;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const fileUrl = await getFileUrl(fileId);
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
