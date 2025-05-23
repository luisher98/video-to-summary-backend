import { Transform } from 'stream';

/**
 * Configuration options for adaptive buffering
 */
export interface AdaptiveBufferOptions {
    /**
     * Initial buffer size in bytes
     * @default 64 * 1024 (64KB)
     */
    initialBufferSize?: number;
    
    /**
     * Minimum buffer size in bytes
     * @default 16 * 1024 (16KB)
     */
    minBufferSize?: number;
    
    /**
     * Maximum buffer size in bytes
     * @default 1024 * 1024 (1MB)
     */
    maxBufferSize?: number;
    
    /**
     * Rate at which buffer increases when things are going well
     * @default 1.5
     */
    growthFactor?: number;
    
    /**
     * Rate at which buffer decreases when things are going poorly
     * @default 0.5
     */
    shrinkFactor?: number;
    
    /**
     * How often to evaluate buffer size, in milliseconds
     * @default 1000 (1 second)
     */
    evaluationInterval?: number;
    
    /**
     * Latency threshold in ms that triggers buffer size adjustment
     * @default 500 (500ms)
     */
    latencyThreshold?: number;
    
    /**
     * Callback when buffer size changes
     */
    onBufferSizeChange?: (newSize: number, reason: string) => void;
}

/**
 * Creates a Transform stream that implements adaptive buffering
 * based on network conditions and processing speed
 */
export class AdaptiveBuffer extends Transform {
    private bufferSize: number;
    private minBufferSize: number;
    private maxBufferSize: number;
    private growthFactor: number;
    private shrinkFactor: number;
    private evaluationInterval: number;
    private latencyThreshold: number;
    private buffer: Buffer[] = [];
    private totalBytes: number = 0;
    private bufferBytes: number = 0;
    private lastEmptyTime: number = Date.now();
    private lastEvalTime: number = Date.now();
    private processingLatency: number[] = [];
    private onBufferSizeChange?: (newSize: number, reason: string) => void;
    private evaluationTimer?: ReturnType<typeof setInterval>;
    private isProcessing: boolean = false;

    /**
     * Creates a new adaptive buffer
     */
    constructor(options: AdaptiveBufferOptions = {}) {
        super({ objectMode: false });
        
        this.minBufferSize = options.minBufferSize ?? 16 * 1024; // 16KB
        this.maxBufferSize = options.maxBufferSize ?? 1024 * 1024; // 1MB
        this.bufferSize = options.initialBufferSize ?? 64 * 1024; // 64KB
        this.growthFactor = options.growthFactor ?? 1.5;
        this.shrinkFactor = options.shrinkFactor ?? 0.5;
        this.evaluationInterval = options.evaluationInterval ?? 1000; // 1 second
        this.latencyThreshold = options.latencyThreshold ?? 500; // 500ms
        this.onBufferSizeChange = options.onBufferSizeChange;
        
        this.startEvaluation();
    }
    
    /**
     * Starts the buffer evaluation timer
     */
    private startEvaluation(): void {
        this.evaluationTimer = setInterval(() => this.evaluateBufferSize(), this.evaluationInterval);
    }
    
    /**
     * Stops the buffer evaluation timer
     */
    private stopEvaluation(): void {
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
            this.evaluationTimer = undefined;
        }
    }
    
    /**
     * Evaluates if buffer size should be adjusted based on performance metrics
     */
    private evaluateBufferSize(): void {
        const now = Date.now();
        const timeSinceEval = now - this.lastEvalTime;
        this.lastEvalTime = now;
        
        // Skip if no data is flowing
        if (this.totalBytes === 0 || this.processingLatency.length === 0) {
            return;
        }
        
        // Calculate average latency
        const avgLatency = this.processingLatency.reduce((sum, val) => sum + val, 0) / 
                          this.processingLatency.length;
        
        // Clear latency measurements for next interval
        this.processingLatency = [];
        
        // Adjust buffer size based on latency
        if (avgLatency > this.latencyThreshold) {
            // High latency - shrink buffer to reduce pressure
            this.adjustBufferSize(this.bufferSize * this.shrinkFactor, 'High latency');
        } else if (this.bufferBytes > this.bufferSize * 0.9) {
            // Buffer almost full - grow buffer if we have capacity
            this.adjustBufferSize(this.bufferSize * this.growthFactor, 'Buffer pressure');
        } else if (this.bufferBytes < this.bufferSize * 0.3) {
            // Buffer underutilized - consider shrinking
            this.adjustBufferSize(this.bufferSize * 0.8, 'Buffer underutilized');
        }
    }
    
    /**
     * Adjusts the buffer size within min/max constraints
     */
    private adjustBufferSize(newSize: number, reason: string): void {
        const oldSize = this.bufferSize;
        this.bufferSize = Math.max(this.minBufferSize, Math.min(this.maxBufferSize, newSize));
        
        // Only notify if there was an actual change
        if (this.bufferSize !== oldSize && this.onBufferSizeChange) {
            this.onBufferSizeChange(this.bufferSize, reason);
        }
    }
    
    /**
     * Called when data is written to the stream
     */
    _transform(chunk: Buffer, encoding: string, callback: (error?: Error | null) => void): void {
        this.totalBytes += chunk.length;
        this.bufferBytes += chunk.length;
        this.buffer.push(chunk);
        
        // If we're not currently processing, start processing
        if (!this.isProcessing) {
            this.processBuffer();
        }
        
        callback();
    }
    
    /**
     * Process buffered data
     */
    private processBuffer(): void {
        if (this.buffer.length === 0) {
            this.isProcessing = false;
            this.lastEmptyTime = Date.now();
            return;
        }
        
        const startTime = Date.now();
        this.isProcessing = true;
        
        // Check if we should emit batched data
        if (this.bufferBytes >= this.bufferSize || 
            (Date.now() - this.lastEmptyTime > 5000)) { // Force emit after 5s
            
            // Combine all buffers and emit them
            const data = Buffer.concat(this.buffer);
            this.buffer = [];
            this.bufferBytes = 0;
            
            this.push(data);
            
            // Record processing latency
            const latency = Date.now() - startTime;
            this.processingLatency.push(latency);
        }
        
        // Continue processing in next tick
        setImmediate(() => this.processBuffer());
    }
    
    /**
     * Flush any remaining data when the stream ends
     */
    _flush(callback: (error?: Error | null) => void): void {
        if (this.buffer.length > 0) {
            const data = Buffer.concat(this.buffer);
            this.buffer = [];
            this.bufferBytes = 0;
            this.push(data);
        }
        
        this.stopEvaluation();
        callback();
    }
    
    /**
     * Gets current buffer statistics
     */
    getStats(): object {
        return {
            bufferSize: this.bufferSize,
            currentBufferBytes: this.bufferBytes,
            bufferUtilization: this.bufferBytes / this.bufferSize,
            totalBytesProcessed: this.totalBytes
        };
    }
} 