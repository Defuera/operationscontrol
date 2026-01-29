import type { AIProvider } from './types';
import { createOpenAIProvider } from './openai';

// Lazy initialization to avoid errors when API key is not set
let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!_provider) {
    _provider = createOpenAIProvider();
  }
  return _provider;
}

export * from './types';
