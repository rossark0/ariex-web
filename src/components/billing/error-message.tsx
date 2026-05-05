interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}
