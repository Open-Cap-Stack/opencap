import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function DataTable({ columns, data, isLoading, error, onRetry, onRowClick, emptyMessage }) {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage || 'No data available'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || row._id || i} className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                onClick={() => onRowClick?.(row)}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
