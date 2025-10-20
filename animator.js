// Animator Module - Playback Loop, Offset Cycling, Speed Control

export class Animator {
    constructor(renderer, buffer) {
        this.renderer = renderer
        this.buffer = buffer
        this.isPlaying = false
        this.offset = 0
        this.speed = 4 // steps per second
        this.lastTime = 0
        this.accumulatedTime = 0
        this.frameTime = 1000 / this.speed // milliseconds per step

        this.animationId = null
        this.onOffsetChange = null // Callback for UI updates
    }

    // Start animation
    start() {
        if (this.isPlaying) return

        this.isPlaying = true
        this.lastTime = performance.now()
        this.accumulateTime = 0
        this.animate()
    }

    // Stop animation
    stop() {
        this.isPlaying = false
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    // Toggle play/pause
    toggle() {
        if (this.isPlaying) {
            this.stop()
        } else {
            this.start()
        }
    }

    // Animation loop
    animate() {
        if (!this.isPlaying) return

        const currentTime = performance.now()
        const deltaTime = currentTime - this.lastTime
        this.lastTime = currentTime

        this.accumulatedTime += deltaTime

        // Check if enough time has passed for next step
        while (this.accumulatedTime >= this.frameTime) {
            this.step(1)
            this.accumulatedTime -= this.frameTime
        }

        this.animationId = requestAnimationFrame(() => this.animate())
    }

    // Step offset by direction (-1 or +1)
    step(direction = 1) {
        const oldOffset = this.offset
        this.offset = (this.offset + direction + this.buffer.levels) % this.buffer.levels

        if (this.offset !== oldOffset) {
            this.render()
            this.notifyOffsetChange()
        }
    }

    // Set offset directly
    setOffset(newOffset) {
        const clampedOffset = Math.max(0, Math.min(newOffset, this.buffer.levels - 1))
        if (clampedOffset !== this.offset) {
            this.offset = clampedOffset
            this.render()
            this.notifyOffsetChange()
        }
    }

    // Get current offset
    getOffset() {
        return this.offset
    }

    // Set speed (steps per second)
    setSpeed(newSpeed) {
        this.speed = Math.max(0.1, Math.min(newSpeed, 30)) // Clamp to reasonable range
        this.frameTime = 1000 / this.speed
    }

    // Get current speed
    getSpeed() {
        return this.speed
    }

    // Set playing state
    setPlaying(playing) {
        if (playing && !this.isPlaying) {
            this.start()
        } else if (!playing && this.isPlaying) {
            this.stop()
        }
    }

    // Get playing state
    getPlaying() {
        return this.isPlaying
    }

    // Render current frame
    render() {
        // This will be called by the main app with current threshold settings
        // The animator just manages the offset and timing
        const event = new CustomEvent('renderFrame', {
            detail: { offset: this.offset },
        })
        document.dispatchEvent(event)
    }

    // Notify UI of offset change
    notifyOffsetChange() {
        if (this.onOffsetChange) {
            this.onOffsetChange(this.offset)
        }
    }

    // Set callback for offset changes
    setOnOffsetChange(callback) {
        this.onOffsetChange = callback
    }

    // Reset to beginning
    reset() {
        this.setOffset(0)
    }

    // Update buffer reference (when buffer changes)
    updateBuffer(newBuffer) {
        this.buffer = newBuffer
        // Clamp offset to new buffer's level range
        this.offset = Math.min(this.offset, this.buffer.levels - 1)
    }

    // Get animation state for debugging
    getState() {
        return {
            isPlaying: this.isPlaying,
            offset: this.offset,
            speed: this.speed,
            frameTime: this.frameTime,
            accumulatedTime: this.accumulatedTime,
        }
    }
}
