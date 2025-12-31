interface TypingIndicatorProps {
  isVisible?: boolean;
  className?: string;
}

export function TypingIndicator({ isVisible = true, className = '' }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className={`flex items-center space-x-2 text-gray-400 text-sm ${className}`}>
      <span>Agent is typing</span>
      <div className="flex space-x-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
