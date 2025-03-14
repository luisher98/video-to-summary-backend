import { Progress, ProcessingStage, PROCESSING_STAGES } from '../types/progress.types.js';

export class ProgressTracker {
  private currentStage: ProcessingStage;
  private observers: ((progress: Progress) => void)[] = [];
  private lastProgress = 0;
  private isCompleted = false;
  private cleanupCallbacks: (() => Promise<void>)[] = [];

  constructor() {
    this.currentStage = PROCESSING_STAGES[0];
  }

  addObserver(observer: (progress: Progress) => void): void {
    this.observers.push(observer);
  }

  addCleanupTask(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  getCurrentStage(): string {
    return this.currentStage.name;
  }

  private notifyObservers(progress: Progress): void {
    // Don't send updates after completion except for errors
    if (this.isCompleted && progress.status !== 'error') {
      return;
    }

    // Ensure progress never goes backwards
    if (progress.progress < this.lastProgress && progress.status !== 'error') {
      progress.progress = this.lastProgress;
    }
    
    // Update last progress if not an error
    if (progress.status !== 'error') {
      this.lastProgress = progress.progress;
    }

    this.observers.forEach(observer => observer(progress));
  }

  updateProgress(stageName: string, stageProgress: number): void {
    // Don't update progress after completion
    if (this.isCompleted) {
      return;
    }

    const stage = PROCESSING_STAGES.find(s => s.name === stageName);
    if (!stage) {
      throw new Error(`Invalid stage: ${stageName}`);
    }

    // Clamp progress between 0 and 100
    stageProgress = Math.max(0, Math.min(100, stageProgress));

    this.currentStage = stage;
    const [min, max] = stage.progressRange;
    const overallProgress = min + (stageProgress / 100) * (max - min);

    this.notifyObservers({
      status: stage.status,
      message: stage.getMessage(stageProgress),
      progress: Math.round(overallProgress)
    });
  }

  async complete(summary: string): Promise<void> {
    // Send the done stage immediately with the summary
    const doneStage = PROCESSING_STAGES[PROCESSING_STAGES.length - 1];
    this.notifyObservers({
      status: 'done',
      message: summary,
      progress: 100
    });

    this.isCompleted = true;

    // Run cleanup tasks in parallel after notifying completion
    try {
      await Promise.all(this.cleanupCallbacks.map(callback => {
        return callback().catch(error => {
          console.error('Cleanup task failed:', error);
        });
      }));
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  error(message: string): void {
    // Don't expose internal error details to the client
    const userMessage = 'An error occurred while processing your request. Please try again.';
    
    console.error('Processing error:', message);

    this.notifyObservers({
      status: 'error',
      message: userMessage,
      progress: this.lastProgress,
      error: userMessage
    });

    // Run cleanup tasks even on error
    Promise.all(this.cleanupCallbacks.map(callback => {
      return callback().catch(error => {
        console.error('Cleanup task failed during error handling:', error);
      });
    })).catch(error => {
      console.error('Error during cleanup after error:', error);
    });
  }
} 