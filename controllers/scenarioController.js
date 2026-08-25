/**
 * Scenario Controller
 * Issue #176: RBAC-protected CRUD stubs for scenario management.
 *
 * These endpoints replace the unprotected inline stubs that were previously
 * defined in app.js.  No persistent backend yet — the frontend falls back to
 * localStorage.  When a database layer is wired up, swap out these handlers.
 */

/**
 * GET /api/v1/scenarios
 * Returns an empty list (frontend uses localStorage).
 */
exports.list = (req, res) => {
  res.json([]);
};

/**
 * POST /api/v1/scenarios
 * Echoes back the request body with a generated id.
 */
exports.create = (req, res) => {
  res.status(201).json({
    ...req.body,
    id: req.body.id || Date.now().toString()
  });
};

/**
 * PUT /api/v1/scenarios/:id
 * Echoes back the request body with the path id.
 */
exports.update = (req, res) => {
  res.json({
    ...req.body,
    id: req.params.id
  });
};

/**
 * DELETE /api/v1/scenarios/:id
 * Returns a success acknowledgement.
 */
exports.remove = (req, res) => {
  res.json({ success: true });
};
