/**
 * Carta Migration Controller
 * Issue #652: Carta migration score tool
 */

const cartaMigrationScorerService = require('../services/cartaMigrationScorerService');

/**
 * POST /api/v1/migration/carta/analyze
 * Analyze a Carta export and return migration readiness score
 */
exports.analyzeCartaExport = async (req, res) => {
  try {
    const exportData = req.body;

    if (!exportData || typeof exportData !== 'object' || Array.isArray(exportData)) {
      return res.status(400).json({ message: 'Request body must be a Carta export object' });
    }

    const result = cartaMigrationScorerService.analyzeExport(exportData);

    res.status(200).json(result);
  } catch (error) {
    console.error('Carta migration analysis failed:', error);
    res.status(500).json({ message: error.message });
  }
};
