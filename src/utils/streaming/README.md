# Streaming Utilities

This directory contains utilities for efficient streaming and adaptive buffering.

## AdaptiveBuffer

The `AdaptiveBuffer` is a Transform stream that automatically adjusts buffer size based on network conditions and processing speed. It dynamically grows or shrinks the buffer to optimize performance.

### Key Features

- **Dynamic Buffer Sizing**: Automatically adjusts buffer size based on processing latency
- **Adaptive to Network Conditions**: Grows buffer in good conditions, shrinks in poor conditions
- **Memory Efficient**: Never buffers more than needed
- **Backpressure Handling**: Correctly implements Node.js stream backpressure
- **Real-time Metrics**: Provides monitoring of buffer utilization

### Usage Example

```typescript
import { AdaptiveBuffer } from '@/utils/streaming/AdaptiveBuffer.js';
import fs from 'fs';

// Create source and destination streams
const sourceStream = fs.createReadStream('large-file.mp4');
const destinationStream = fs.createWriteStream('output.mp4');

// Create adaptive buffer with custom options
const buffer = new AdaptiveBuffer({
  initialBufferSize: 128 * 1024, // 128KB initial buffer
  maxBufferSize: 2 * 1024 * 1024, // 2MB max buffer
  onBufferSizeChange: (newSize, reason) => {
    console.log(`Buffer adjusted to ${Math.round(newSize / 1024)}KB due to ${reason}`);
  }
});

// Connect streams with adaptive buffer
sourceStream
  .pipe(buffer)
  .pipe(destinationStream)
  .on('finish', () => {
    console.log('Stream processing complete');
    console.log('Buffer stats:', buffer.getStats());
  });
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `initialBufferSize` | Starting buffer size in bytes | 64KB |
| `minBufferSize` | Minimum buffer size | 16KB |
| `maxBufferSize` | Maximum buffer size | 1MB |
| `growthFactor` | Rate of buffer growth | 1.5 |
| `shrinkFactor` | Rate of buffer shrink | 0.5 |
| `evaluationInterval` | How often to check performance | 1000ms |
| `latencyThreshold` | Latency that triggers adjustment | 500ms |
| `onBufferSizeChange` | Callback when buffer size changes | undefined |

### Performance Benefits

1. **Faster Processing**: By optimizing buffer size, data can be processed more efficiently
2. **Lower Memory Usage**: Adaptive sizing means memory use scales with needs
3. **Better Experience**: Reduces stalling on slow networks or with resource-intensive processing
4. **Automatic Optimization**: No need to manually tune buffer sizes

### When to Use

- Video/audio processing pipelines
- Network streaming with variable bandwidth
- File transcoding
- Any stream pipeline where processing speed may vary

## Implementation Details

The AdaptiveBuffer works by monitoring:

1. **Processing Latency**: How long it takes to process each chunk
2. **Buffer Utilization**: How full the buffer is
3. **System Memory**: Available memory and current usage

It then adjusts the buffer size based on these metrics to maintain optimal throughput with minimal memory usage. 