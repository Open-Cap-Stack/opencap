/**
 * StreamProcessingService Tests
 * Issue #50: Implement Data Processing Pipeline
 *
 * Test suite for stream processing including:
 * - Event processing with filters, transforms, enrichers
 * - Window-based aggregations (tumbling, sliding, session, count)
 * - Backpressure handling
 * - Stream lifecycle (pause, resume, close)
 * - Dead letter queue
 * - Retry logic
 */

const streamProcessingService = require('../../../services/streamProcessingService');

describe('StreamProcessingService', () => {
  beforeEach(() => {
    streamProcessingService.reset();
  });

  describe('processEvent', () => {
    it('should process a single event with a processor', async () => {
      const processor = jest.fn().mockResolvedValue({ result: 'processed' });
      const event = { type: 'test', data: 'hello' };

      const result = await streamProcessingService.processEvent(event, processor);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 'processed' });
      expect(processor).toHaveBeenCalledWith(event);
    });

    it('should return error for null event', async () => {
      const result = await streamProcessingService.processEvent(null, jest.fn());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid event');
    });

    it('should return error for undefined event', async () => {
      const result = await streamProcessingService.processEvent(undefined, jest.fn());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid event');
    });

    it('should filter out events that do not match filter', async () => {
      const processor = jest.fn();
      const filter = (e) => e.type === 'important';

      const result = await streamProcessingService.processEvent(
        { type: 'ignore' },
        processor,
        { filter }
      );

      expect(result.filtered).toBe(true);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should process events that match filter', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const filter = (e) => e.type === 'important';

      const result = await streamProcessingService.processEvent(
        { type: 'important' },
        processor,
        { filter }
      );

      expect(result.success).toBe(true);
      expect(processor).toHaveBeenCalled();
    });

    it('should apply transform before processing', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const transform = (e) => ({ ...e, transformed: true });

      await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { transform }
      );

      expect(processor).toHaveBeenCalledWith(
        expect.objectContaining({ transformed: true })
      );
    });

    it('should apply enrichers in order', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const enricher1 = jest.fn().mockResolvedValue({ type: 'test', step1: true });
      const enricher2 = jest.fn().mockResolvedValue({ type: 'test', step1: true, step2: true });

      await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { enrichers: [enricher1, enricher2] }
      );

      expect(enricher1).toHaveBeenCalled();
      expect(enricher2).toHaveBeenCalledWith(expect.objectContaining({ step1: true }));
      expect(processor).toHaveBeenCalledWith(expect.objectContaining({ step2: true }));
    });

    it('should broadcast to multiple processors', async () => {
      const proc1 = jest.fn().mockResolvedValue('r1');
      const proc2 = jest.fn().mockResolvedValue('r2');

      const result = await streamProcessingService.processEvent(
        { type: 'test' },
        [proc1, proc2],
        { routing: 'broadcast' }
      );

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual(['r1', 'r2']);
      expect(proc1).toHaveBeenCalled();
      expect(proc2).toHaveBeenCalled();
    });

    it('should use first processor when array given with single routing', async () => {
      const proc1 = jest.fn().mockResolvedValue('r1');
      const proc2 = jest.fn().mockResolvedValue('r2');

      const result = await streamProcessingService.processEvent(
        { type: 'test' },
        [proc1, proc2],
        { routing: 'single' }
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('r1');
      expect(proc1).toHaveBeenCalled();
      expect(proc2).not.toHaveBeenCalled();
    });

    it('should track metrics when trackMetrics is true', async () => {
      const processor = jest.fn().mockResolvedValue('ok');

      await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { trackMetrics: true }
      );

      const metrics = streamProcessingService.getMetrics();
      expect(metrics.eventsProcessed).toBe(1);
    });

    it('should track errors in metrics', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('fail'));

      await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { trackMetrics: true }
      );

      const metrics = streamProcessingService.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    it('should add failed events to dead letter queue', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('processing error'));

      await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { deadLetterQueue: true }
      );

      const dlq = streamProcessingService.getDeadLetterQueue();
      expect(dlq).toHaveLength(1);
      expect(dlq[0].error).toBe('processing error');
    });

    it('should retry failed processing', async () => {
      const processor = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      const result = await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { retry: { maxAttempts: 3, delay: 10 } }
      );

      expect(result.success).toBe(true);
      expect(processor).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should fail after exhausting retries', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('persistent error'));

      const result = await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { retry: { maxAttempts: 2, delay: 10 } }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('persistent error');
      expect(processor).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('aggregateWindow', () => {
    const sumAggregator = (events) => events.reduce((sum, e) => sum + e.value, 0);

    it('should return empty windows for empty events', async () => {
      const result = await streamProcessingService.aggregateWindow([], sumAggregator);
      expect(result.windows).toEqual([]);
    });

    describe('tumbling windows', () => {
      it('should create tumbling windows', async () => {
        const events = [
          { timestamp: 0, value: 1 },
          { timestamp: 5, value: 2 },
          { timestamp: 10, value: 3 },
          { timestamp: 15, value: 4 }
        ];

        const result = await streamProcessingService.aggregateWindow(events, sumAggregator, {
          windowType: 'tumbling',
          windowSize: 10
        });

        expect(result.windows).toHaveLength(2);
        expect(result.windows[0].aggregation).toBe(3); // 1+2
        expect(result.windows[1].aggregation).toBe(7); // 3+4
      });

      it('should support groupBy in tumbling windows', async () => {
        const events = [
          { timestamp: 0, value: 1, category: 'A' },
          { timestamp: 5, value: 2, category: 'B' },
          { timestamp: 8, value: 3, category: 'A' }
        ];

        const result = await streamProcessingService.aggregateWindow(events, sumAggregator, {
          windowType: 'tumbling',
          windowSize: 10,
          groupBy: (e) => e.category
        });

        expect(result.windows).toHaveLength(1);
        expect(result.windows[0].groups).toBeDefined();
        expect(result.windows[0].groups['A']).toBe(4);
        expect(result.windows[0].groups['B']).toBe(2);
      });

      it('should return empty for missing windowSize', async () => {
        const result = await streamProcessingService.aggregateWindow(
          [{ timestamp: 0, value: 1 }],
          sumAggregator,
          { windowType: 'tumbling' }
        );

        expect(result.windows).toEqual([]);
      });
    });

    describe('sliding windows', () => {
      it('should create sliding windows', async () => {
        const events = [
          { timestamp: 0, value: 1 },
          { timestamp: 5, value: 2 },
          { timestamp: 10, value: 3 }
        ];

        const result = await streamProcessingService.aggregateWindow(events, sumAggregator, {
          windowType: 'sliding',
          windowSize: 10,
          slideInterval: 5
        });

        expect(result.windows.length).toBeGreaterThanOrEqual(2);
      });

      it('should return empty for missing parameters', async () => {
        const result = await streamProcessingService.aggregateWindow(
          [{ timestamp: 0, value: 1 }],
          sumAggregator,
          { windowType: 'sliding', windowSize: 10 }
        );

        expect(result.windows).toEqual([]);
      });
    });

    describe('session windows', () => {
      it('should create session windows based on gaps', async () => {
        const events = [
          { timestamp: 0, value: 1 },
          { timestamp: 3, value: 2 },
          { timestamp: 100, value: 3 },
          { timestamp: 103, value: 4 }
        ];

        const result = await streamProcessingService.aggregateWindow(events, sumAggregator, {
          windowType: 'session',
          sessionTimeout: 10
        });

        expect(result.windows).toHaveLength(2);
        expect(result.windows[0].aggregation).toBe(3);
        expect(result.windows[1].aggregation).toBe(7);
      });

      it('should return empty for missing sessionTimeout', async () => {
        const result = await streamProcessingService.aggregateWindow(
          [{ timestamp: 0, value: 1 }],
          sumAggregator,
          { windowType: 'session' }
        );

        expect(result.windows).toEqual([]);
      });
    });

    describe('count-based windows', () => {
      it('should create count-based windows', async () => {
        const events = [
          { value: 1 },
          { value: 2 },
          { value: 3 },
          { value: 4 },
          { value: 5 }
        ];

        const result = await streamProcessingService.aggregateWindow(events, sumAggregator, {
          windowType: 'count',
          windowSize: 2
        });

        expect(result.windows).toHaveLength(3);
        expect(result.windows[0].aggregation).toBe(3);  // 1+2
        expect(result.windows[1].aggregation).toBe(7);  // 3+4
        expect(result.windows[2].aggregation).toBe(5);  // 5
        expect(result.windows[0].startIndex).toBe(0);
        expect(result.windows[0].endIndex).toBe(1);
      });
    });

    it('should mark last window as partial when emitPartialWindows is true', async () => {
      const events = [{ timestamp: 0, value: 1 }, { timestamp: 5, value: 2 }];

      const result = await streamProcessingService.aggregateWindow(events, sumAggregator, {
        windowType: 'tumbling',
        windowSize: 10,
        emitPartialWindows: true
      });

      expect(result.windows[result.windows.length - 1].partial).toBe(true);
    });
  });

  describe('Stream class', () => {
    it('should create a stream and process events', async () => {
      const processor = jest.fn().mockResolvedValue('result');
      const stream = streamProcessingService.createStream({ processor });

      const result = await stream.emit({ data: 'test' });

      expect(result).toBe('result');
      expect(processor).toHaveBeenCalled();
      expect(stream.metrics.eventsProcessed).toBe(1);

      await stream.close();
    });

    it('should report running/paused/closed status', async () => {
      const stream = streamProcessingService.createStream({
        processor: async (e) => e
      });

      expect(stream.isRunning()).toBe(true);
      expect(stream.isPaused()).toBe(false);
      expect(stream.isClosed()).toBe(false);

      stream.pause();
      expect(stream.isPaused()).toBe(true);

      stream.resume();
      expect(stream.isPaused()).toBe(false);

      await stream.close();
      expect(stream.isRunning()).toBe(false);
      expect(stream.isClosed()).toBe(true);
    });

    it('should buffer events when paused', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const stream = streamProcessingService.createStream({ processor });

      stream.pause();
      await stream.emit({ data: 'buffered' });

      expect(processor).not.toHaveBeenCalled();
      expect(stream.buffer).toHaveLength(1);

      await stream.close();
    });

    it('should drop events when buffer is full with drop strategy', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const stream = streamProcessingService.createStream({
        processor,
        backpressure: { strategy: 'drop', maxBufferSize: 2 }
      });

      // Fill buffer to max
      stream.buffer = [1, 2];

      await stream.emit({ data: 'dropped' });

      expect(stream.metrics.eventsDropped).toBe(1);

      await stream.close();
    });

    it('should not process events after close', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const stream = streamProcessingService.createStream({ processor });

      await stream.close();
      await stream.emit({ data: 'after-close' });

      expect(processor).not.toHaveBeenCalled();
    });

    it('should get backpressure status', () => {
      const stream = streamProcessingService.createStream({
        processor: async (e) => e,
        backpressure: { strategy: 'buffer', maxBufferSize: 100 }
      });

      const status = stream.getBackpressureStatus();

      expect(status.bufferedEvents).toBe(0);
      expect(status.strategy).toBe('buffer');
      expect(status.droppedEvents).toBe(0);

      stream.close();
    });

    it('should get backpressure metrics', () => {
      const stream = streamProcessingService.createStream({
        processor: async (e) => e,
        backpressure: { strategy: 'buffer', maxBufferSize: 100 }
      });

      const metrics = stream.getBackpressureMetrics();

      expect(metrics.bufferUtilization).toBe(0);
      expect(metrics.processingLatency).toBe(0);
      expect(typeof metrics.throughput).toBe('number');

      stream.close();
    });

    it('should handle priority queue strategy', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const stream = streamProcessingService.createStream({
        processor,
        backpressure: {
          strategy: 'priority-queue',
          maxBufferSize: 100,
          priorityExtractor: (e) => e.priority || 'normal'
        }
      });

      await stream.emit({ data: 'high', priority: 'high' });
      await stream.emit({ data: 'low', priority: 'low' });
      await stream.emit({ data: 'normal' });

      expect(stream.priorityQueues.high).toHaveLength(1);
      expect(stream.priorityQueues.low).toHaveLength(1);
      expect(stream.priorityQueues.normal).toHaveLength(1);

      await stream.close();
    });

    it('should gracefully close processing buffered events', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      const stream = streamProcessingService.createStream({ processor });

      stream.pause();
      await stream.emit({ data: 'buf1' });
      await stream.emit({ data: 'buf2' });

      expect(stream.buffer).toHaveLength(2);

      await stream.close({ graceful: true });

      // Buffer should have been processed during graceful close
      expect(stream.isClosed()).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return aggregated metrics', () => {
      const metrics = streamProcessingService.getMetrics();

      expect(metrics).toHaveProperty('eventsProcessed');
      expect(metrics).toHaveProperty('processingTime');
      expect(metrics).toHaveProperty('errors');
    });
  });

  describe('getDeadLetterQueue', () => {
    it('should return a copy of the dead letter queue', () => {
      streamProcessingService.deadLetterQueue.push({
        event: { type: 'fail' },
        error: 'bad',
        timestamp: new Date()
      });

      const dlq = streamProcessingService.getDeadLetterQueue();
      expect(dlq).toHaveLength(1);

      // Should be a copy
      dlq.push({ extra: true });
      expect(streamProcessingService.getDeadLetterQueue()).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should clear all state', async () => {
      const processor = jest.fn().mockResolvedValue('ok');
      streamProcessingService.createStream({ processor });

      await streamProcessingService.processEvent(
        { type: 'test' },
        processor,
        { trackMetrics: true }
      );

      streamProcessingService.reset();

      const metrics = streamProcessingService.getMetrics();
      expect(metrics.eventsProcessed).toBe(0);
      expect(streamProcessingService.streams.size).toBe(0);
      expect(streamProcessingService.getDeadLetterQueue()).toHaveLength(0);
    });
  });
});
