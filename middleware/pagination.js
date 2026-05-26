/**
 * Pagination helper - enforces max limits on list endpoints
 */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = Math.max(parseInt(query.skip) || 0, 0);
  const page = Math.max(parseInt(query.page) || 1, 1);
  return { limit, skip: skip || (page - 1) * limit };
}

module.exports = { parsePagination, MAX_LIMIT, DEFAULT_LIMIT };
