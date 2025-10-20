// Renderer Module - Palette Mapping, Threshold Modes, Canvas Rendering

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.imageData = null
    }

    // Generate grayscale palette for L levels
    generatePalette(levels) {
        const palette = []
        for (let i = 0; i < levels; i++) {
            // Invert so level 0 = white, max level = black
            palette[i] = Math.round(((levels - 1 - i) * 255) / (levels - 1))
        }
        return palette
    }

    // Apply cyclic offset to pixel index
    applyCyclicOffset(index, offset, levels) {
        return (index + offset) % levels
    }

    // Apply threshold mode to grayscale value
    applyThreshold(value, threshold, mode) {
        switch (mode) {
            case 'none':
                return value
            case 'mask':
                return value < threshold ? 0 : value
            case 'binary':
                return value < threshold ? 0 : 255
            default:
                return value
        }
    }

    // Render buffer to canvas with animation offset and threshold
    render(buffer, offset = 0, threshold = 128, thresholdMode = 'none') {
        const pixelSize = this.getPixelSize(buffer.width, buffer.height)
        const palette = this.generatePalette(buffer.levels)

        // Clear canvas with background
        this.ctx.fillStyle = '#f0f0f0'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Create image data for efficient rendering
        const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height)
        const data = imageData.data

        // Calculate scaling factors
        const scaleX = this.canvas.width / buffer.width
        const scaleY = this.canvas.height / buffer.height

        // Render each pixel
        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const pixelIndex = y * buffer.width + x
                const originalIndex = buffer.pixels[pixelIndex]

                // Apply cyclic offset
                const offsetIndex = this.applyCyclicOffset(originalIndex, offset, buffer.levels)

                // Get grayscale value from palette
                let grayValue = palette[offsetIndex]

                // Apply threshold
                grayValue = this.applyThreshold(grayValue, threshold, thresholdMode)

                // Calculate display coordinates (scaled and centered)
                const displayX = Math.floor(x * scaleX)
                const displayY = Math.floor(y * scaleY)

                // Fill pixel area
                const pixelWidth = Math.ceil(scaleX)
                const pixelHeight = Math.ceil(scaleY)

                for (let py = 0; py < pixelHeight && displayY + py < this.canvas.height; py++) {
                    for (let px = 0; px < pixelWidth && displayX + px < this.canvas.width; px++) {
                        const pixelX = displayX + px
                        const pixelY = displayY + py

                        if (pixelX >= 0 && pixelX < this.canvas.width && pixelY >= 0 && pixelY < this.canvas.height) {
                            const dataIndex = (pixelY * this.canvas.width + pixelX) * 4
                            data[dataIndex] = grayValue // R
                            data[dataIndex + 1] = grayValue // G
                            data[dataIndex + 2] = grayValue // B
                            data[dataIndex + 3] = 255 // A
                        }
                    }
                }
            }
        }

        // Draw the image data
        this.ctx.putImageData(imageData, 0, 0)

        // Draw grid overlay for smaller resolutions
        if (buffer.width <= 32 && buffer.height <= 32) {
            this.drawGrid(buffer.width, buffer.height, scaleX, scaleY)
        }
    }

    // Draw grid overlay
    drawGrid(width, height, scaleX, scaleY) {
        this.ctx.strokeStyle = '#ddd'
        this.ctx.lineWidth = 1

        // Vertical lines
        for (let x = 0; x <= width; x++) {
            const xPos = Math.floor(x * scaleX)
            this.ctx.beginPath()
            this.ctx.moveTo(xPos, 0)
            this.ctx.lineTo(xPos, this.canvas.height)
            this.ctx.stroke()
        }

        // Horizontal lines
        for (let y = 0; y <= height; y++) {
            const yPos = Math.floor(y * scaleY)
            this.ctx.beginPath()
            this.ctx.moveTo(0, yPos)
            this.ctx.lineTo(this.canvas.width, yPos)
            this.ctx.stroke()
        }
    }

    // Calculate optimal pixel size for display
    getPixelSize(width, height) {
        return Math.min(this.canvas.width / width, this.canvas.height / height)
    }

    // Get current image data for export
    getImageData() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    // Render static version (no animation offset) - useful for editor
    renderStatic(buffer, threshold = 128, thresholdMode = 'none') {
        this.render(buffer, 0, threshold, thresholdMode)
    }

    // Clear canvas
    clear() {
        this.ctx.fillStyle = '#f0f0f0'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    // Resize canvas
    resize(width, height) {
        this.canvas.width = width
        this.canvas.height = height
    }
}
