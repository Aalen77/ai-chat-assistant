import ChatInterface from './components/ChatInterface'
import SessionSidebar from './components/SessionSidebar'
import { useChat } from './hooks/useChat'
import './App.css'

function App() {
  const {
    messages, sessions, currentSessionId, isLoading, error, currentRole,
    sendMessage, clearMessages, selectSession, createSession, deleteSession,
    renameSession, exportChat, isInitialized,
  } = useChat()

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 animate-pulse" />
          <p className="text-xs text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelect={selectSession}
        onCreate={createSession}
        onDelete={deleteSession}
        onRename={renameSession}
      />
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-red-50 border-b border-red-100 text-red-600 px-4 py-2.5 text-center text-sm">
            {error}
          </div>
        )}
        <main className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            currentRole={currentRole}
            onExport={exportChat}
            onClear={clearMessages}
          />
        </main>
      </div>
    </div>
  )
}

export default App
