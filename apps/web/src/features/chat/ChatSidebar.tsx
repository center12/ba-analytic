import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ChatMessage, type ChatSession } from '@/lib/api';
import { useAppStore } from '@/store';
import { Send, PlusCircle, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatSidebar({ featureId }: { featureId: string }) {
  const qc = useQueryClient();
  const activeProvider = useAppStore((s) => s.activeProvider);
  const selectedSession = useAppStore((s) => s.selectedChatSession);
  const setSelectedSession = useAppStore((s) => s.setSelectedChatSession);

  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['chat-sessions', featureId],
    queryFn: () => api.chat.listSessions(featureId),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', selectedSession?.id],
    queryFn: () => api.chat.listMessages(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => api.chat.createSession(featureId),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['chat-sessions', featureId] });
      setSelectedSession(session);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = () => {
    if (!input.trim() || !selectedSession || isStreaming) return;

    const message = input.trim();
    setInput('');
    setStreamingContent('');
    setIsStreaming(true);

    const es = api.chat.stream(selectedSession.id, message, activeProvider);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as { chunk?: string; done?: boolean };
      if (data.chunk) setStreamingContent((prev) => prev + data.chunk);
      if (data.done) {
        es.close();
        setIsStreaming(false);
        setStreamingContent('');
        qc.invalidateQueries({ queryKey: ['chat-messages', selectedSession.id] });
      }
    };

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Session list header */}
      <div className="border-b p-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm">Chat</span>
        <button
          onClick={() => createSessionMutation.mutate()}
          className="text-muted-foreground hover:text-foreground"
          title="New chat session"
        >
          <PlusCircle size={16} />
        </button>
      </div>

      {/* Session tabs */}
      {sessions.length > 0 && (
        <div className="border-b px-2 py-2 flex gap-1 overflow-x-auto shrink-0">
          {sessions.map((s: ChatSession) => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s)}
              className={cn(
                'text-xs px-2 py-1 rounded whitespace-nowrap',
                selectedSession?.id === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!selectedSession ? (
          <p className="text-muted-foreground text-sm text-center mt-8">
            Start a new chat session to ask questions about this feature.
          </p>
        ) : messages.length === 0 && !isStreaming ? (
          <p className="text-muted-foreground text-sm text-center mt-8">
            No messages yet. Ask something!
          </p>
        ) : (
          <>
            {messages.map((m: ChatMessage) => (
              <div
                key={m.id}
                className={cn('flex gap-2', m.role === 'USER' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'ASSISTANT' && (
                  <Bot size={16} className="text-primary mt-1 shrink-0" />
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'USER'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}
                >
                  {m.content}
                </div>
                {m.role === 'USER' && (
                  <User size={16} className="text-muted-foreground mt-1 shrink-0" />
                )}
              </div>
            ))}

            {isStreaming && streamingContent && (
              <div className="flex gap-2 justify-start">
                <Bot size={16} className="text-primary mt-1 shrink-0" />
                <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted">
                  {streamingContent}
                  <span className="inline-block w-1.5 h-3.5 bg-foreground/50 ml-0.5 animate-pulse" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2 shrink-0">
        <input
          className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
          placeholder={selectedSession ? 'Ask a question...' : 'Create a session first'}
          value={input}
          disabled={!selectedSession || isStreaming}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !selectedSession || isStreaming}
          className="bg-primary text-primary-foreground p-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
