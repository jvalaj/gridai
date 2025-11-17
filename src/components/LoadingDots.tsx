/**
 * LoadingDots Component
 * 
 * Three dots loading animation for chat messages.
 */

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
    </div>
  );
}
