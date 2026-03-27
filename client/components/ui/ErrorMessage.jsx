export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="text-red-600 mb-2">{message || 'Something went wrong'}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-red-700 underline hover:no-underline">
          Try again
        </button>
      )}
    </div>
  );
}
