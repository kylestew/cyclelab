// Editor Module - PixelBuffer, Drawing Tools, Undo Stack

export class PixelBuffer {
    constructor(width, height, levels = 8) {
        this.width = width
        this.height = height
        this.levels = levels
        this.pixels = new Array(width * height).fill(0)
    }

    // Re-quantize all pixels when levels change
    setLevels(newLevels) {
        if (newLevels === this.levels) return

        const oldLevels = this.levels
        this.levels = newLevels

        // Re-quantize existing pixels
        for (let i = 0; i < this.pixels.length; i++) {
            const oldValue = this.pixels[i]
            // Map old value to new range
            const normalized = oldValue / (oldLevels - 1)
            this.pixels[i] = Math.round(normalized * (newLevels - 1))
        }
    }

    // Get pixel value at coordinates
    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0
        }
        return this.pixels[y * this.width + x]
    }

    // Set pixel value at coordinates
    setPixel(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return
        }
        const clampedValue = Math.max(0, Math.min(value, this.levels - 1))
        this.pixels[y * this.width + x] = clampedValue
    }

    // Draw with current level
    draw(x, y, level) {
        this.setPixel(x, y, level)
    }

    // Erase (set to 0)
    erase(x, y) {
        this.setPixel(x, y, 0)
    }

    // Create a snapshot for undo/redo
    createSnapshot() {
        return {
            width: this.width,
            height: this.height,
            levels: this.levels,
            pixels: [...this.pixels],
        }
    }

    // Restore from snapshot
    restoreFromSnapshot(snapshot) {
        this.width = snapshot.width
        this.height = snapshot.height
        this.levels = snapshot.levels
        this.pixels = [...snapshot.pixels]
    }

    // Clear all pixels
    clear() {
        this.pixels.fill(0)
    }

    // Resize buffer
    resize(newWidth, newHeight) {
        const newPixels = new Array(newWidth * newHeight).fill(0)

        // Copy existing pixels
        for (let y = 0; y < Math.min(this.height, newHeight); y++) {
            for (let x = 0; x < Math.min(this.width, newWidth); x++) {
                const oldIndex = y * this.width + x
                const newIndex = y * newWidth + x
                newPixels[newIndex] = this.pixels[oldIndex]
            }
        }

        this.width = newWidth
        this.height = newHeight
        this.pixels = newPixels
    }
}

export class Editor {
    constructor(canvas, buffer) {
        this.canvas = canvas
        this.buffer = buffer
        this.ctx = canvas.getContext('2d')
        this.currentTool = 'pencil'
        this.currentLevel = this.buffer.levels - 1 // Start with black (max level)

        // Undo/redo stack
        this.undoStack = []
        this.redoStack = []
        this.maxUndoSteps = 50

        // Drawing state
        this.isDrawing = false
        this.lastX = -1
        this.lastY = -1

        this.setupEventListeners()
        this.saveSnapshot() // Initial state
        this.resizeCanvas()
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this))

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect()
        const pixelSize = this.getPixelSize()

        // Calculate drawing area dimensions and offset
        const drawingWidth = this.buffer.width * pixelSize
        const drawingHeight = this.buffer.height * pixelSize
        const offsetX = Math.floor((this.canvas.width - drawingWidth) / 2)
        const offsetY = Math.floor((this.canvas.height - drawingHeight) / 2)

        // Convert mouse coordinates to canvas coordinates
        const canvasX = event.clientX - rect.left
        const canvasY = event.clientY - rect.top

        // Convert to pixel coordinates, accounting for offset
        const x = Math.floor((canvasX - offsetX) / pixelSize)
        const y = Math.floor((canvasY - offsetY) / pixelSize)

        if (event.shiftKey) {
            // Eyedropper
            this.currentLevel = this.buffer.getPixel(x, y)
            this.updateLevelDisplay()
            return
        }

        this.isDrawing = true
        this.lastX = x
        this.lastY = y

        this.drawPixel(x, y)
    }

    handleMouseMove(event) {
        if (!this.isDrawing) return

        const rect = this.canvas.getBoundingClientRect()
        const pixelSize = this.getPixelSize()

        // Calculate drawing area dimensions and offset
        const drawingWidth = this.buffer.width * pixelSize
        const drawingHeight = this.buffer.height * pixelSize
        const offsetX = Math.floor((this.canvas.width - drawingWidth) / 2)
        const offsetY = Math.floor((this.canvas.height - drawingHeight) / 2)

        // Convert mouse coordinates to canvas coordinates
        const canvasX = event.clientX - rect.left
        const canvasY = event.clientY - rect.top

        // Convert to pixel coordinates, accounting for offset
        const x = Math.floor((canvasX - offsetX) / pixelSize)
        const y = Math.floor((canvasY - offsetY) / pixelSize)

        if (x !== this.lastX || y !== this.lastY) {
            this.drawPixel(x, y)
            this.lastX = x
            this.lastY = y
        }
    }

    handleMouseUp(event) {
        if (this.isDrawing) {
            this.isDrawing = false
            this.saveSnapshot()
        }
    }

    drawPixel(x, y) {
        if (this.currentTool === 'pencil') {
            this.buffer.draw(x, y, this.currentLevel)
        } else if (this.currentTool === 'eraser') {
            this.buffer.erase(x, y)
        }

        this.render()
    }

    setTool(tool) {
        this.currentTool = tool
    }

    setLevel(level) {
        this.currentLevel = Math.max(0, Math.min(level, this.buffer.levels - 1))
    }

    getLevel() {
        return this.currentLevel
    }

    // Resize canvas to take up 90% of parent's smallest dimension
    resizeCanvas() {
        const container = this.canvas.parentElement
        const containerRect = container.getBoundingClientRect()

        // Get 90% of the smaller dimension
        const smallerDimension = Math.min(containerRect.width, containerRect.height)
        const targetSize = Math.floor(smallerDimension * 0.9)

        // Set canvas size to target size (square)
        this.canvas.style.width = targetSize + 'px'
        this.canvas.style.height = targetSize + 'px'

        // Also set the actual canvas resolution to match
        this.canvas.width = targetSize
        this.canvas.height = targetSize
    }

    // Calculate pixel size for display
    getPixelSize() {
        // Calculate pixel size based on canvas size and buffer dimensions
        const pixelSize = Math.floor(this.canvas.width / Math.max(this.buffer.width, this.buffer.height))
        return Math.max(1, pixelSize) // Ensure minimum pixel size of 1
    }

    // Render the current buffer to canvas
    render() {
        const pixelSize = this.getPixelSize()

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Fill background
        this.ctx.fillStyle = '#f0f0f0'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Calculate drawing area dimensions
        const drawingWidth = this.buffer.width * pixelSize
        const drawingHeight = this.buffer.height * pixelSize

        // Center the drawing area
        const offsetX = Math.floor((this.canvas.width - drawingWidth) / 2)
        const offsetY = Math.floor((this.canvas.height - drawingHeight) / 2)

        // Generate palette
        const palette = this.generatePalette()

        // Draw pixels
        for (let y = 0; y < this.buffer.height; y++) {
            for (let x = 0; x < this.buffer.width; x++) {
                const pixelValue = this.buffer.getPixel(x, y)
                const grayValue = palette[pixelValue]

                this.ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`
                this.ctx.fillRect(offsetX + x * pixelSize, offsetY + y * pixelSize, pixelSize, pixelSize)
            }
        }

        // Draw grid
        this.ctx.strokeStyle = '#ddd'
        this.ctx.lineWidth = 1

        for (let x = 0; x <= this.buffer.width; x++) {
            this.ctx.beginPath()
            this.ctx.moveTo(offsetX + x * pixelSize, offsetY)
            this.ctx.lineTo(offsetX + x * pixelSize, offsetY + drawingHeight)
            this.ctx.stroke()
        }

        for (let y = 0; y <= this.buffer.height; y++) {
            this.ctx.beginPath()
            this.ctx.moveTo(offsetX, offsetY + y * pixelSize)
            this.ctx.lineTo(offsetX + drawingWidth, offsetY + y * pixelSize)
            this.ctx.stroke()
        }
    }

    generatePalette() {
        const palette = []
        for (let i = 0; i < this.buffer.levels; i++) {
            // Invert so level 0 = white, max level = black
            palette[i] = Math.round(((this.buffer.levels - 1 - i) * 255) / (this.buffer.levels - 1))
        }
        return palette
    }

    updateLevelDisplay() {
        // This will be called by the UI controller
        const event = new CustomEvent('levelChanged', { detail: { level: this.currentLevel } })
        document.dispatchEvent(event)
    }

    // Undo/Redo functionality
    saveSnapshot() {
        this.undoStack.push(this.buffer.createSnapshot())
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift()
        }
        this.redoStack = [] // Clear redo stack when new action is performed
    }

    undo() {
        if (this.undoStack.length > 1) {
            const currentSnapshot = this.undoStack.pop()
            this.redoStack.push(currentSnapshot)
            this.buffer.restoreFromSnapshot(this.undoStack[this.undoStack.length - 1])
            this.render()
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const snapshot = this.redoStack.pop()
            this.undoStack.push(snapshot)
            this.buffer.restoreFromSnapshot(snapshot)
            this.render()
        }
    }

    // Resize the buffer and update display
    resizeBuffer(width, height) {
        this.buffer.resize(width, height)
        this.saveSnapshot()
        this.render()
    }

    // Update levels and re-render
    updateLevels(newLevels) {
        this.buffer.setLevels(newLevels)
        this.currentLevel = Math.min(this.currentLevel, newLevels - 1)
        this.render()
    }

    getBuffer() {
        return this.buffer
    }
}
