import { create } from 'zustand';
import type { Scenario } from '../data/scenarios';

export interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ScenarioState {
  scenario: Scenario | null;
  messages: Message[];
  questionCount: number;
  finished: boolean;
  usedHintsMap: { [scenarioId: string]: number }; // 시나리오별 사용 힌트 횟수
  setScenario: (scenario: Scenario) => void;
  addMessage: (message: Message) => void;
  incrementQuestionCount: () => void;
  setFinished: (finished: boolean) => void;
  resetMessages: () => void;
  useHint: (scenarioId: string) => void; // 힌트 사용 액션
  loadInitialHints: (scenarioId: string, count: number) => void; // 초기 힌트 로드 액션
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenario: null,
  messages: [],
  questionCount: 0,
  finished: false,
  usedHintsMap: {},
  setScenario: (scenario) => set({ scenario, messages: [], questionCount: 0, finished: false }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    questionCount: message.role === 'user' ? state.questionCount + 1 : state.questionCount,
  })),
  incrementQuestionCount: () => set((state) => ({ questionCount: state.questionCount + 1 })),
  setFinished: (finished) => set({ finished }),
  resetMessages: () => set({ messages: [] }),
  useHint: (scenarioId) => {
    const currentScenarioHints = get().usedHintsMap[scenarioId] || 0;
    const scenario = get().scenario;
    if (scenario && scenario.hints && currentScenarioHints < scenario.hints.length) {
      set((state) => ({
        usedHintsMap: {
          ...state.usedHintsMap,
          [scenarioId]: currentScenarioHints + 1,
        },
      }));
    }
  },
  loadInitialHints: (scenarioId, count) => {
    set((state) => ({
      usedHintsMap: {
        ...state.usedHintsMap,
        [scenarioId]: count,
      },
    }));
  },
})); 