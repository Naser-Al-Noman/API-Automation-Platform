const { query } = require('../db/pool');

async function getSummary(req, res) {
  try {
    const userId = req.user.id;

    const [collections, environments, executions, recent] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS count
         FROM collections
         WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int AS count
         FROM environments
         WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int AS count
         FROM executions e
         JOIN collections c ON c.id = e.collection_id
         WHERE c.user_id = $1`,
        [userId]
      ),
      query(
        `SELECT e.id, e.collection_id, e.environment_id, e.status,
                e.started_at, e.finished_at, e.report_url,
                c.name AS collection_name,
                env.name AS environment_name
         FROM executions e
         JOIN collections c ON c.id = e.collection_id
         LEFT JOIN environments env ON env.id = e.environment_id
         WHERE c.user_id = $1
         ORDER BY e.started_at DESC NULLS LAST, e.id DESC
         LIMIT 20`,
        [userId]
      ),
    ]);

    const recentRows = recent.rows;
    const finished = recentRows.filter(
      (row) => row.status === 'passed' || row.status === 'failed'
    );
    const passedCount = finished.filter((row) => row.status === 'passed').length;
    const recentPassRate =
      finished.length === 0
        ? null
        : Math.round((passedCount / finished.length) * 1000) / 10;

    return res.json({
      totalCollections: collections.rows[0].count,
      totalEnvironments: environments.rows[0].count,
      totalExecutions: executions.rows[0].count,
      recentPassRate,
      recentPassRateSampleSize: finished.length,
      recentExecutions: recentRows.slice(0, 5),
    });
  } catch (err) {
    console.error('dashboard getSummary error:', err);
    return res.status(500).json({ message: 'Failed to load dashboard summary' });
  }
}

module.exports = {
  getSummary,
};
