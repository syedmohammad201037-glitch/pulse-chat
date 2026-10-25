import { pipeline, env, TextStreamer } from '@huggingface/transformers';

// Browser-only, CPU-only (WebAssembly). No GPU is ever requested.
env.allowLocalModels = false;
env.useBrowserCache = true; // weights download once, then load from cache

try {
  const wasm: any = (env.backends as any).onnx?.wasm;
  if (wasm) {
    const cores = (self as any).navigator?.hardwareConcurrency || 2;
    // Multi-thread only works on cross-origin-isolated pages; otherwise ORT falls back to 1.
    wasm.numThreads = Math.max(1, Math.min(4, cores - 1));
  }
} catch {}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export interface WorkerRequest {
  id: number;
  type: 'init' | 'chat';
  modelId?: string;
  dtype?: 'q4' | 'q8' | 'fp32';
  messages?: Msg[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

let generator: any = null;
let loadedModel = '';
let queue: Promise<void> = Promise.resolve();

async function loadModel(modelId: string, dtype: string) {
  if (generator && loadedModel === modelId) return generator;
  generator = null;
  generator = await pipeline('text-generation', modelId, {
    device: 'wasm',
    dtype: dtype as any,
    progress_callback: (p: any) => self.postMessage({ type: 'progress', data: p }),
  });
  loadedModel = modelId;
  return generator;
}

async function handle(req: WorkerRequest) {
  const { id } = req;
  try {
    const pipe = await loadModel(
      req.modelId || 'HuggingFaceTB/SmolLM2-135M-Instruct',
      req.dtype || 'q8'
    );

    if (req.type === 'init') {
      self.postMessage({ type: 'ready', id, modelId: loadedModel });
      return;
    }

    self.postMessage({ type: 'start', id });

    const streamer = req.stream
      ? new TextStreamer(pipe.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (text: string) => self.postMessage({ type: 'token', id, text }),
        })
      : undefined;

    const temperature = req.temperature ?? 0.6;
    const output = await pipe(req.messages || [], {
      max_new_tokens: req.maxTokens || 128,
      temperature,
      do_sample: temperature > 0,
      top_k: 40,
      repetition_penalty: 1.1,
      streamer,
    });

    const gen = output?.[0]?.generated_text;
    const text = Array.isArray(gen) ? gen[gen.length - 1]?.content || '' : String(gen || '');
    self.postMessage({ type: 'done', id, text: text.trim() });
  } catch (e: any) {
    self.postMessage({ type: 'error', id, error: e?.message || String(e) });
  }
}

// Requests run strictly one at a time so replies never get mixed up.
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  queue = queue.then(() => handle(e.data));
};
