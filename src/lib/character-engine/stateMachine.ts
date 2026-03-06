import type { CamState, CamEvent } from '../types';

export interface StateMachineConfig {
    characterSlug: string;
    idleClipUrl: string;
    onStateChange: (state: CamState, clipUrl: string, audioUrl?: string) => void;
}

/**
 * Client-side state machine for the Live Cam.
 * Manages transitions between idle animations and action clips.
 */
export class CharacterStateMachine {
    private state: CamState = 'IDLE';
    private config: StateMachineConfig;
    private actionQueue: CamEvent[] = [];
    private isPlaying = false;

    constructor(config: StateMachineConfig) {
        this.config = config;
    }

    getState(): CamState {
        return this.state;
    }

    /**
     * Handle incoming WebSocket event
     */
    handleEvent(event: CamEvent) {
        this.actionQueue.push(event);
        if (!this.isPlaying) {
            this.playNext();
        }
    }

    /**
     * Play the next action in the queue, or return to idle
     */
    private playNext() {
        const event = this.actionQueue.shift();

        if (!event) {
            this.transitionTo('IDLE', this.config.idleClipUrl);
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const newState: CamState = event.isRare ? 'RARE_EVENT' : 'ACTION';
        this.transitionTo(newState, event.clipUrl, event.audioUrl);
    }

    /**
     * Called when the current action clip finishes playing
     */
    onClipEnd() {
        this.playNext();
    }

    private transitionTo(state: CamState, clipUrl: string, audioUrl?: string) {
        this.state = state;
        this.config.onStateChange(state, clipUrl, audioUrl);
    }

    /**
     * Reset to idle state
     */
    reset() {
        this.actionQueue = [];
        this.isPlaying = false;
        this.transitionTo('IDLE', this.config.idleClipUrl);
    }
}
