const CompensationBenchmark = require('../models/compensationBenchmarkModel');

// Fetch Compensation Benchmark Attributes
exports.getBenchmarkAttributes = async (req, res) => {
  try {
    // Sample data to simulate attributes based on a corporation's plan
    const attributes = {
      benchmarks_metadata: {
        benchmarks_version_datetime: { value: '2024-01-01T09:00:00.000000Z' },
      },
      compensation_types: ['SALARY', 'EQUITY_AS_FULLY_DILUTED_PERCENT'],
      industries: ['All'],
      percentiles: ['P25', 'P50', 'P75'],
      post_money_valuation_buckets: ['10M to 25M', '50M to 100M'],
      geo_adjustment_location: ['Dallas-Fort Worth-Arlington, TX', 'New York-Newark-Jersey City, NY-NJ-PA', 'San Francisco-Oakland-Hayward, CA'],
      jobs: [
        {
          job_area: 'Engineering',
          job_specialization: 'Web Engineer',
          job_levels: ['IC 2', 'IC 3', 'MGR 4', 'MGR 5', 'EX 10', 'EX 11'],
        },
      ],
    };

    res.status(200).json(attributes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Retrieve Compensation Benchmarks
exports.getBenchmarks = async (req, res) => {
  try {
    const benchmarks = await CompensationBenchmark.find({ corporationId: req.query.corporationId });

    res.status(200).json({
      access: {
        access_level: 'FULL_ACCESS',
        access_reason: '',
      },
      benchmarks_metadata: {
        benchmarks_version_datetime: { value: '2024-01-01T09:00:00.000000Z' },
      },
      benchmarks,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update Compensation Benchmarks
exports.updateBenchmark = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBenchmark = await CompensationBenchmark.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedBenchmark) {
      return res.status(404).json({ error: 'Benchmark not found' });
    }

    res.status(200).json(updatedBenchmark);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
