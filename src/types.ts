export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  timestamp: number
}

export interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface SessionInfo {
  id: number
  title: string
  role: string
  created_at: string
}

export const AI_ROLES: Record<string, { name: string; icon: string; prompt: string }> = {
  assistant: {
    name: '通用助手',
    icon: '🤖',
    prompt: '你是一个智能AI助手，请友好、详细地回答用户的问题。',
  },
  coding: {
    name: '编程助手',
    icon: '💻',
    prompt: '你是一个专业的编程助手，擅长各种编程语言和技术栈。帮助用户解决编程问题、代码审查、调试、架构设计等。回答时要提供清晰的代码示例。',
  },
  writing: {
    name: '写作助手',
    icon: '✍️',
    prompt: '你是一个写作助手，擅长文章写作、润色、翻译、创意写作、文案策划等。帮助用户提升文字表达能力，给出专业的写作建议。',
  },
  psychologist: {
    name: '心理咨询师',
    icon: '🧠',
    prompt: '你是一个温暖、专业、富有同理心的心理咨询师。倾听用户的心声，提供专业的心理建议和情感支持。始终保持耐心、理解和尊重，不评判用户的感受。',
  },
  tutor: {
    name: '学习导师',
    icon: '📚',
    prompt: '你是一个耐心、博学的学习导师。帮助用户理解各种知识点，用通俗易懂的方式解释复杂概念。鼓励用户思考，引导式教学。',
  },
  translator: {
    name: '翻译助手',
    icon: '🌐',
    prompt: '你是一个专业翻译助手，精通多语种翻译。提供准确、地道、符合语境的翻译结果，并解释文化差异和语言细节。',
  },
}
