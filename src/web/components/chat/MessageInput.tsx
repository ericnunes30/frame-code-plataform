import { useState, FormEvent, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending || disabled) return;

    setSending(true);
    try {
      await onSend(content.trim());
      setContent('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <textarea
        value={content}
        onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || sending}
        rows={1}
        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
        style={{ minHeight: '44px', maxHeight: '200px' }}
      />
      <button
        type="submit"
        disabled={!content.trim() || sending || disabled}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {sending ? '...' : 'Send'}
      </button>
    </form>
  );
}
