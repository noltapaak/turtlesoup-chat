import { create } from 'zustand';
import { Scenario } from '../data/scenarios';

export interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ScenarioState {
  scenario: Scenario | null;
  messages: Message[];
  questionCount: number;
  finished: boolean;
  setScenario: (s: Scenario) => void;
  addMessage: (m: Message) => void;
  setFinished: (v: boolean) => void;
  reset: () => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenario: null,
  messages: [],
  questionCount: 0,
  finished: false,
  setScenario: (s: Scenario) => set(() => ({ scenario: s, messages: [], questionCount: 0, finished: false })),
  addMessage: (m: Message) => set((state) => ({
    messages: [...state.messages, m],
    questionCount: m.role === 'user' ? state.questionCount + 1 : state.questionCount,
  })),
  setFinished: (v: boolean) => set(() => ({ finished: v })),
  reset: () => set(() => ({ scenario: null, messages: [], questionCount: 0, finished: false })),
})); 