export interface Section {
  id: string;
  title: string;
  category: 'Introduction' | 'Principles & Theory' | 'Practice Principles' | 'Practice Approaches' | 'Targeting Practice' | 'Improving Practice' | 'Appendices' | 'App Guide';
  content: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface ChatState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
}

export interface Highlight {
  id: string;
  text: string;
  sectionId: string;
  sectionTitle: string;
  author?: string;
  date: number;
  note?: string;
}

export interface Reflection {
  id: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  date: number;
}