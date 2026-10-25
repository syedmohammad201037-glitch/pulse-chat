// CPU-only on-device AI (Transformers.js + ONNX/WASM). No GPU needed.
export type LocalAiDevice = 'wasm';
export type LocalAiDtype = 'q4' | 'q8' | 'fp32';

export interface ModelProgressDetail {
  status: string;
  file?: string;
  progress?: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  size: string;
  recommendedDevice: LocalAiDevice;
  dtype: LocalAiDtype;
  default?: boolean;
}

export const LOCAL_MODELS: ModelOption[] = [
  {
    id: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    name: 'Fast',
    description: 'SmolLM2-135M. Tiny and quick, runs on any CPU.',
    size: '~140 MB',
    recommendedDevice: 'wasm',
    dtype: 'q8',
    default: true,
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Smarter',
    description: 'Qwen2.5-0.5B. Better answers, bigger download, slower on CPU.',
    size: '~510 MB',
    recommendedDevice: 'wasm',
    dtype: 'q8',
  },
];

export interface LocalAiState {
  status: 'unloaded' | 'loading' | 'ready' | 'generating' | 'error';
  statusMessage: string;
  activeModelId: string;
  activeDevice: LocalAiDevice;
  activeDtype: LocalAiDtype;
  webGpuSupported: boolean; // kept for compatibility; always false (CPU-only)
  progressList: Record<string, ModelProgressDetail>;
  overallProgress: number;
  isCached: boolean;
  error: string | null;
}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
type Listener = (s: LocalAiState) => void;
type Pending = {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  onToken?: (t: string) => void;
};

class LocalAiService {
  private worker: Worker | null = null;
  private listeners = new Set<Listener>();
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private loadPromise: Promise<boolean> | null = null;
  private loadingModel = '';

  private state: LocalAiState = {
    status: 'unloaded',
    statusMessage: 'Not loaded',
    activeModelId: LOCAL_MODELS[0].id,
    activeDevice: 'wasm',
    activeDtype: LOCAL_MODELS[0].dtype,
    webGpuSupported: false,
    progressList: {},
    overallProgress: 0,
    isCached: false,
    error: null,
  };

  constructor() {
    this.checkCache();
  }

  async checkCache() {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        if (keys.some((k) => k.includes('transformers') || k.includes('onnx'))) {
          this.update({ isCached: true });
        }
      }
    } catch {}
  }

  getState() {
    return this.state;
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.state);
    return () => {
      this.listeners.delete(l);
    };
  }

  private update(p: Partial<LocalAiState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l(this.state));
  }

  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./localAiWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => this.onMessage(e.data);
    w.onerror = () => {
      this.update({ status: 'error', error: 'AI worker crashed', statusMessage: 'Error' });
      this.pending.forEach((p) => p.reject(new Error('AI worker crashed')));
      this.pending.clear();
      this.worker = null;
      this.loadPromise = null;
    };
    this.worker = w;
    return w;
  }

  private onMessage(d: any) {
    switch (d.type) {
      case 'progress': {
        const f = d.data?.file;
        if (!f) return;
        const list = { ...this.state.progressList, [f]: d.data };
        const vals = (Object.values(list) as ModelProgressDetail[]).filter(
          (x) => typeof x.progress === 'number'
        );
        const avg = vals.length
          ? Math.round(vals.reduce((a, x) => a + (x.progress || 0), 0) / vals.length)
          : 0;
        this.update({
          progressList: list,
          overallProgress: avg,
          status: 'loading',
          statusMessage: `Downloading model ${avg}%`,
        });
        break;
      }
      case 'ready': {
        this.update({
          status: 'ready',
          statusMessage: 'Ready',
          activeModelId: d.modelId,
          isCached: true,
          overallProgress: 100,
          error: null,
        });
        this.pending.get(d.id)?.resolve(true);
        this.pending.delete(d.id);
        break;
      }
      case 'start':
        this.update({ status: 'generating', statusMessage: 'Thinking…' });
        break;
      case 'token':
        this.pending.get(d.id)?.onToken?.(d.text);
        break;
      case 'done':
        this.update({ status: 'ready', statusMessage: 'Ready' });
        this.pending.get(d.id)?.resolve(d.text);
        this.pending.delete(d.id);
        break;
      case 'error': {
        const wasLoading = this.state.status === 'loading';
        const msg = /unauthorized|401|403|404|fetch|network/i.test(d.error || '')
          ? "Can't download the model. Check your internet connection and try again."
          : d.error;
        this.update({
          status: wasLoading ? 'error' : 'ready',
          error: wasLoading ? msg : null,
          statusMessage: wasLoading ? 'Failed to load' : 'Ready',
        });
        this.pending.get(d.id)?.reject(new Error(d.error));
        this.pending.delete(d.id);
        break;
      }
    }
  }

  private send(payload: any, onToken?: (t: string) => void): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onToken });
      this.getWorker().postMessage({ id, ...payload });
    });
  }

  /** Download (once) and load the model. CPU/WASM only. */
  async loadModel(modelId?: string, _device?: string, dtype?: LocalAiDtype): Promise<boolean> {
    const id = modelId || this.state.activeModelId;
    const opt = LOCAL_MODELS.find((m) => m.id === id);
    const dt = dtype || opt?.dtype || this.state.activeDtype;

    if (this.state.status === 'ready' && this.state.activeModelId === id) return true;
    if (this.loadPromise && this.loadingModel === id) return this.loadPromise;

    this.loadingModel = id;
    this.update({
      status: 'loading',
      activeModelId: id,
      activeDtype: dt,
      statusMessage: 'Loading model…',
      progressList: {},
      overallProgress: 0,
      error: null,
    });
    this.loadPromise = this.send({ type: 'init', modelId: id, dtype: dt }).finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private async chat(
    messages: Msg[],
    maxTokens: number,
    temperature: number,
    onToken?: (t: string) => void
  ): Promise<string> {
    await this.loadModel();
    return this.send(
      {
        type: 'chat',
        modelId: this.state.activeModelId,
        dtype: this.state.activeDtype,
        messages,
        maxTokens,
        temperature,
        stream: !!onToken,
      },
      onToken
    );
  }

  generateChat(
    messages: Msg[],
    maxTokens = 160,
    temperature = 0.6,
    onToken?: (t: string) => void
  ) {
    const withSystem: Msg[] = [
      {
        role: 'system',
        content: 'You are a helpful, concise assistant inside a chat app. Keep answers short.',
      },
      ...messages,
    ];
    return this.chat(withSystem, maxTokens, temperature, onToken);
  }

  async generateSmartReplies(messageText: string): Promise<string[]> {
    const out = await this.chat(
      [
        {
          role: 'system',
          content:
            'Suggest exactly 3 very short replies (max 5 words each) to the message. One per line. No numbering, no quotes, no extra text.',
        },
        { role: 'user', content: messageText },
      ],
      40,
      0.7
    );
    const lines = out
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\]\s"']+|["']+$/g, '').trim())
      .filter((l) => l.length > 1 && l.length < 40);
    return lines.length ? lines.slice(0, 3) : ['Got it, thanks!', 'Sounds good!', 'Will check shortly'];
  }

  async summarizeChat(context: string): Promise<string> {
    return this.chat(
      [
        {
          role: 'system',
          content: 'Summarize the conversation in 2-3 short bullet points. Output only the bullets.',
        },
        { role: 'user', content: context },
      ],
      100,
      0.3
    );
  }

  async polishDraft(draft: string): Promise<string> {
    const out = await this.chat(
      [
        {
          role: 'system',
          content:
            'Rewrite the user message to be clear and polite. Keep the same meaning and language. Output only the rewritten message.',
        },
        { role: 'user', content: draft },
      ],
      80,
      0.4
    );
    return out.replace(/^["']|["']$/g, '').trim() || draft;
  }

  async clearCache(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        for (const k of await window.caches.keys()) {
          if (k.includes('transformers') || k.includes('onnx')) await window.caches.delete(k);
        }
      }
      this.worker?.terminate();
      this.worker = null;
      this.loadPromise = null;
      this.update({
        isCached: false,
        status: 'unloaded',
        statusMessage: 'Not loaded',
        progressList: {},
        overallProgress: 0,
        error: null,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const localAiService = new LocalAiService();
