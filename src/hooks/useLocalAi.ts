import { useState, useEffect, useCallback } from 'react';
import {
  localAiService,
  LocalAiState,
  LocalAiDevice,
  LocalAiDtype,
  LOCAL_MODELS,
  ModelOption,
} from '../lib/localAiService';

export function useLocalAi() {
  const [state, setState] = useState<LocalAiState>(() => localAiService.getState());

  useEffect(() => {
    const unsubscribe = localAiService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const loadModel = useCallback(
    async (modelId?: string, device?: LocalAiDevice | string, dtype?: LocalAiDtype) => {
      try {
        return await localAiService.loadModel(modelId, device, dtype);
      } catch {
        return false; // error is shown through state.error
      }
    },
    []
  );

  const generateChat = useCallback(
    async (
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
      maxTokens?: number,
      temperature?: number,
      onToken?: (t: string) => void
    ) => {
      return await localAiService.generateChat(messages, maxTokens, temperature, onToken);
    },
    []
  );

  const generateSmartReplies = useCallback(async (messageText: string) => {
    return await localAiService.generateSmartReplies(messageText);
  }, []);

  const summarizeChat = useCallback(async (chatContext: string) => {
    return await localAiService.summarizeChat(chatContext);
  }, []);

  const polishDraft = useCallback(async (draftText: string) => {
    return await localAiService.polishDraft(draftText);
  }, []);

  const clearCache = useCallback(async () => {
    return await localAiService.clearCache();
  }, []);

  return {
    ...state,
    models: LOCAL_MODELS,
    loadModel,
    generateChat,
    generateSmartReplies,
    summarizeChat,
    polishDraft,
    clearCache,
  };
}
