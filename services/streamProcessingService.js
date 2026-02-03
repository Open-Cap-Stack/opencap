/**
 * Stream Processing Service
 * Issue #50: Implement Data Processing Pipeline
 *
 * Provides real-time event processing, window-based aggregations,
 * and backpressure handling for streaming data
 */

const { EventEmitter } = require('events');

/**
 * Stream class for event processing
 */
class Stream extends EventEmitter {
  constructor(options = {}) {
    super();
    this.processor = options.processor;
    this.backpressureConfig = options.backpressure || { strategy: 'buffer', maxBufferSize: 1000 };
    this.buffer = [];
    this.running = true;
    this.paused = false;
    this.closed = false;
    this.metrics = {
      eventsProcessed: 0,
      eventsDropped: 0,
      processingTime: [],
      startTime: Date.now()
    };
    this.workers = 1;
    this.priorityQueues = { high: [], normal: [], low: [] };
  }

  async emit(event) {
    if (this.closed) return;

    if (this.paused) {
      this._bufferEvent(event);
      return;
    }

    // Handle backpressure
    if (this.backpressureConfig.strategy === 'throttle') {
      await this._handleThrottling();
    }

    if (this.backpressureConfig.strategy === 'priority-queue') {
      this._handlePriorityQueue(event);
      return;
    }

    if (this.buffer.length >= this.backpressureConfig.maxBufferSize) {
      if (this.backpressureConfig.strategy === 'drop') {
        this.metrics.eventsDropped++;
        return;
      } else if (this.backpressureConfig.strategy === 'pause') {
        super.emit('pause');
        this._bufferEvent(event);
        return;
      }
    }

    try {
      const startTime = Date.now();
      const result = await this.processor(event);
      this.metrics.eventsProcessed++;
      this.metrics.processingTime.push(Date.now() - startTime);
      super.emit('data', result);
      return result;
    } catch (error) {
      super.emit('error', error);
    }
  }

  _bufferEvent(event) {
    if (this.buffer.length < this.backpressureConfig.maxBufferSize) {
      this.buffer.push(event);
    } else {
      this.metrics.eventsDropped++;
    }
  }

  async _handleThrottling() {
    const { maxEventsPerSecond = 100 } = this.backpressureConfig;
    const elapsed = Date.now() - this.metrics.startTime;
    const expectedEvents = (elapsed / 1000) * maxEventsPerSecond;

    if (this.metrics.eventsProcessed >= expectedEvents) {
      const waitTime = Math.max(0, (1000 / maxEventsPerSecond) - 10);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  _handlePriorityQueue(event) {
    const priority = this.backpressureConfig.priorityExtractor
      ? this.backpressureConfig.priorityExtractor(event)
      : 'normal';

    if (this.priorityQueues[priority]) {
      this.priorityQueues[priority].push(event);
    } else {
      this.priorityQueues.normal.push(event);
    }
  }

  getBackpressureStatus() {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const currentRate = this.metrics.eventsProcessed / Math.max(elapsed, 1);

    return {
      bufferedEvents: this.buffer.length,
      strategy: this.backpressureConfig.strategy,
      droppedEvents: this.metrics.eventsDropped,
      throttled: this.backpressureConfig.strategy === 'throttle',
      currentRate: Math.round(currentRate),
      currentWorkers: this.workers,
      queuedByPriority: {
        high: this.priorityQueues.high.length,
        normal: this.priorityQueues.normal.length,
        low: this.priorityQueues.low.length
      }
    };
  }

  getBackpressureMetrics() {
    const avgProcessingTime = this.metrics.processingTime.length > 0
      ? this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length
      : 0;

    const elapsed = (Date.now() - this.metrics.startTime) / 1000;

    return {
      bufferUtilization: this.buffer.length / this.backpressureConfig.maxBufferSize,
      processingLatency: avgProcessingTime,
      throughput: this.metrics.eventsProcessed / Math.max(elapsed, 1),
      droppedEvents: this.metrics.eventsDropped
    };
  }

  isRunning() {
    return this.running && !this.closed;
  }

  isPaused() {
    return this.paused;
  }

  isClosed() {
    return this.closed;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    // Process buffered events
    this._processBuffer();
  }

  async _processBuffer() {
    while (this.buffer.length > 0 && !this.paused) {
      const event = this.buffer.shift();
      await this.emit(event);
    }
  }

  async close(options = {}) {
    const { graceful = false } = options;

    if (graceful) {
      await this._processBuffer();
    }

    this.running = false;
    this.closed = true;
    this.removeAllListeners();
  }

  // Stream operators

  map(fn) {
    const mappedStream = new Stream({ processor: async (e) => e });
    this.on('data', async (event) => {
      const mapped = fn(event);
      mappedStream.emit(mapped);
    });
    return mappedStream;
  }

  filter(predicate) {
    const filteredStream = new Stream({ processor: async (e) => e });
    this.on('data', async (event) => {
      if (predicate(event)) {
        filteredStream.emit(event);
      }
    });
    return filteredStream;
  }

  flatMap(fn) {
    const flatMappedStream = new Stream({ processor: async (e) => e });
    this.on('data', async (event) => {
      const items = fn(event);
      for (const item of items) {
        flatMappedStream.emit(item);
      }
    });
    return flatMappedStream;
  }

  reduce(fn, initialValue, options = {}) {
    const { windowSize = 10 } = options;
    const reducedStream = new Stream({ processor: async (e) => e });
    let accumulator = initialValue;
    let count = 0;

    this.on('data', async (event) => {
      accumulator = fn(accumulator, event);
      count++;

      if (count >= windowSize) {
        reducedStream.emit('window', accumulator);
        accumulator = initialValue;
        count = 0;
      }
    });

    return reducedStream;
  }
}

class StreamProcessingService {
  constructor() {
    this.streams = new Map();
    this.metrics = {
      eventsProcessed: 0,
      processingTime: [],
      errors: 0
    };
    this.deadLetterQueue = [];
  }

  /**
   * Reset service state
   */
  reset() {
    this.streams.forEach(stream => stream.close());
    this.streams.clear();
    this.metrics = {
      eventsProcessed: 0,
      processingTime: [],
      errors: 0
    };
    this.deadLetterQueue = [];
  }

  /**
   * Process a single event
   * @param {Object} event - Event to process
   * @param {Function|Array} processor - Processor function(s)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processEvent(event, processor, options = {}) {
    if (!event) {
      return { success: false, error: 'Invalid event: event is null or undefined' };
    }

    const {
      filter,
      transform,
      enrichers = [],
      routing = 'single',
      trackMetrics = false,
      deadLetterQueue = false,
      retry = null
    } = options;

    // Apply filter
    if (filter && !filter(event)) {
      return { filtered: true, reason: 'Event filtered out' };
    }

    // Apply transform
    let processedEvent = transform ? transform(event) : event;

    // Apply enrichers
    for (const enricher of enrichers) {
      processedEvent = await enricher(processedEvent);
    }

    const startTime = Date.now();

    try {
      let output;

      if (Array.isArray(processor) && routing === 'broadcast') {
        // Process with multiple processors
        const outputs = await Promise.all(
          processor.map(p => this._executeProcessor(p, processedEvent, retry))
        );
        output = { outputs };
      } else {
        // Single processor
        const proc = Array.isArray(processor) ? processor[0] : processor;
        output = await this._executeProcessor(proc, processedEvent, retry);
      }

      if (trackMetrics) {
        this.metrics.eventsProcessed++;
        this.metrics.processingTime.push(Date.now() - startTime);
      }

      return {
        success: true,
        output: Array.isArray(processor) && routing === 'broadcast' ? undefined : output,
        outputs: Array.isArray(processor) && routing === 'broadcast' ? output.outputs : undefined
      };

    } catch (error) {
      if (deadLetterQueue) {
        this.deadLetterQueue.push({
          event: processedEvent,
          error: error.message,
          timestamp: new Date()
        });
      }

      if (trackMetrics) {
        this.metrics.errors++;
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute processor with optional retry
   */
  async _executeProcessor(processor, event, retryConfig) {
    if (!retryConfig) {
      return await processor(event);
    }

    const { maxAttempts = 3, delay = 100 } = retryConfig;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await processor(event);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Aggregate events in windows
   * @param {Array} events - Events to aggregate
   * @param {Function} aggregator - Aggregation function
   * @param {Object} options - Window options
   * @returns {Promise<Object>} Aggregation result
   */
  async aggregateWindow(events, aggregator, options = {}) {
    const {
      windowType = 'tumbling',
      windowSize,
      slideInterval,
      sessionTimeout,
      timestampField = 'timestamp',
      emitPartialWindows = false,
      groupBy = null,
      allowedLateness = 0
    } = options;

    if (events.length === 0) {
      return { windows: [] };
    }

    let windows = [];
    let lateEvents = [];

    switch (windowType) {
      case 'tumbling':
        windows = this._createTumblingWindows(events, windowSize, timestampField, groupBy, aggregator);
        break;

      case 'sliding':
        windows = this._createSlidingWindows(events, windowSize, slideInterval, timestampField, aggregator);
        break;

      case 'session':
        windows = this._createSessionWindows(events, sessionTimeout, timestampField, aggregator);
        break;

      case 'count':
        windows = this._createCountWindows(events, windowSize, aggregator);
        break;
    }

    // Handle late events
    if (allowedLateness > 0 && windowType !== 'count') {
      const result = this._handleLateEvents(events, windows, timestampField, allowedLateness);
      lateEvents = result.lateEvents;
    }

    // Mark partial windows
    if (emitPartialWindows && windows.length > 0) {
      windows[windows.length - 1].partial = true;
    }

    return { windows, lateEvents };
  }

  /**
   * Create tumbling windows
   */
  _createTumblingWindows(events, windowSize, timestampField, groupBy, aggregator) {
    if (!windowSize) return [];

    const sortedEvents = [...events].sort((a, b) => a[timestampField] - b[timestampField]);
    const minTime = sortedEvents[0][timestampField];
    const maxTime = sortedEvents[sortedEvents.length - 1][timestampField];

    const windows = [];

    for (let windowStart = minTime; windowStart <= maxTime; windowStart += windowSize) {
      const windowEnd = windowStart + windowSize;
      const windowEvents = sortedEvents.filter(e =>
        e[timestampField] >= windowStart && e[timestampField] < windowEnd
      );

      if (windowEvents.length > 0) {
        if (groupBy) {
          // Group events within window
          const groups = {};
          const groupedEvents = {};

          windowEvents.forEach(event => {
            const key = groupBy(event);
            if (!groupedEvents[key]) groupedEvents[key] = [];
            groupedEvents[key].push(event);
          });

          Object.keys(groupedEvents).forEach(key => {
            groups[key] = aggregator(groupedEvents[key], key);
          });

          windows.push({
            start: windowStart,
            end: windowEnd,
            groups
          });
        } else {
          windows.push({
            start: windowStart,
            end: windowEnd,
            aggregation: aggregator(windowEvents)
          });
        }
      }
    }

    return windows;
  }

  /**
   * Create sliding windows
   */
  _createSlidingWindows(events, windowSize, slideInterval, timestampField, aggregator) {
    if (!windowSize || !slideInterval) return [];

    const sortedEvents = [...events].sort((a, b) => a[timestampField] - b[timestampField]);
    const minTime = sortedEvents[0][timestampField];
    const maxTime = sortedEvents[sortedEvents.length - 1][timestampField];

    const windows = [];

    for (let windowStart = minTime; windowStart <= maxTime; windowStart += slideInterval) {
      const windowEnd = windowStart + windowSize;
      const windowEvents = sortedEvents.filter(e =>
        e[timestampField] >= windowStart && e[timestampField] < windowEnd
      );

      if (windowEvents.length > 0) {
        windows.push({
          start: windowStart,
          end: windowEnd,
          aggregation: aggregator(windowEvents)
        });
      }
    }

    return windows;
  }

  /**
   * Create session windows
   */
  _createSessionWindows(events, sessionTimeout, timestampField, aggregator) {
    if (!sessionTimeout) return [];

    const sortedEvents = [...events].sort((a, b) => a[timestampField] - b[timestampField]);
    const windows = [];
    let currentSession = [];

    sortedEvents.forEach((event, index) => {
      if (currentSession.length === 0) {
        currentSession.push(event);
      } else {
        const lastEvent = currentSession[currentSession.length - 1];
        const gap = event[timestampField] - lastEvent[timestampField];

        if (gap <= sessionTimeout) {
          currentSession.push(event);
        } else {
          // Close current session
          windows.push({
            start: currentSession[0][timestampField],
            end: currentSession[currentSession.length - 1][timestampField],
            aggregation: aggregator(currentSession)
          });
          currentSession = [event];
        }
      }
    });

    // Close final session
    if (currentSession.length > 0) {
      windows.push({
        start: currentSession[0][timestampField],
        end: currentSession[currentSession.length - 1][timestampField],
        aggregation: aggregator(currentSession)
      });
    }

    return windows;
  }

  /**
   * Create count-based windows
   */
  _createCountWindows(events, windowSize, aggregator) {
    if (!windowSize) return [];

    const windows = [];

    for (let i = 0; i < events.length; i += windowSize) {
      const windowEvents = events.slice(i, i + windowSize);
      windows.push({
        startIndex: i,
        endIndex: Math.min(i + windowSize - 1, events.length - 1),
        aggregation: aggregator(windowEvents)
      });
    }

    return windows;
  }

  /**
   * Handle late events
   */
  _handleLateEvents(events, windows, timestampField, allowedLateness) {
    const lateEvents = [];

    if (windows.length === 0) return { lateEvents };

    const lastWindowEnd = Math.max(...windows.map(w => w.end));

    events.forEach(event => {
      const eventTime = event[timestampField];
      if (eventTime < lastWindowEnd - allowedLateness) {
        lateEvents.push(event);
      }
    });

    return { lateEvents };
  }

  /**
   * Handle backpressure (creates a managed stream)
   * @param {Object} config - Backpressure configuration
   * @returns {Stream} Managed stream
   */
  createStream(options = {}) {
    const stream = new Stream(options);
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.streams.set(streamId, stream);
    return stream;
  }

  /**
   * Get processing metrics
   */
  getMetrics() {
    const avgProcessingTime = this.metrics.processingTime.length > 0
      ? this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length
      : 0;

    return {
      eventsProcessed: this.metrics.eventsProcessed,
      processingTime: avgProcessingTime,
      errors: this.metrics.errors
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }
}

module.exports = new StreamProcessingService();
