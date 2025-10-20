// Main Application - UI Controller and Module Coordination

import { PixelBuffer } from './editor.js'
import { Editor } from './editor.js'
import { Renderer } from './renderer.js'
import { Animator } from './animator.js'
import { Exporter } from './exporter.js'

class CycleLabApp {
    constructor() {
        // DOM elements
        this.editorCanvas = document.getElementById('editor-canvas')
        this.previewCanvas = document.getElementById('preview-canvas')

        // Control elements
        this.levelsSlider = document.getElementById('levels-slider')
        this.levelsDisplay = document.getElementById('levels-display')
        this.resolutionButtons = document.querySelectorAll('.resolution-btn')
        this.toolButtons = document.querySelectorAll('.tool-btn')
        this.paletteContainer = document.getElementById('palette-container')
        this.undoBtn = document.getElementById('undo-btn')
        this.redoBtn = document.getElementById('redo-btn')

        // Preview controls
        this.playButton = document.getElementById('play-button')
        this.scrubSlider = document.getElementById('scrub-slider')
        this.speedInput = document.getElementById('speed-input')
        this.thresholdMode = document.getElementById('threshold-mode')
        this.thresholdValue = document.getElementById('threshold-value')
        this.thresholdDisplay = document.getElementById('threshold-display')

        // Export buttons
        this.exportJsonBtn = document.getElementById('export-json')
        this.exportPbmBtn = document.getElementById('export-pbm')

        // Initialize components
        this.buffer = new PixelBuffer(16, 16, 8) // Default 16x16, 8 levels
        this.editor = new Editor(this.editorCanvas, this.buffer)
        this.renderer = new Renderer(this.previewCanvas)
        this.animator = new Animator(this.renderer, this.buffer)
        this.exporter = new Exporter()

        this.setupEventListeners()
        this.updateUI()
        this.createPaletteSelector()
        this.renderPreview()
    }

    setupEventListeners() {
        // Editor controls
        this.levelsSlider.addEventListener('input', (e) => {
            const levels = parseInt(e.target.value)
            this.buffer.setLevels(levels)
            this.editor.updateLevels(levels)
            this.levelsDisplay.textContent = levels
            this.scrubSlider.max = levels - 1
            this.editor.resizeCanvas() // Resize canvas when levels change
            this.createPaletteSelector()
            this.renderPreview()
        })

        // Resolution buttons
        this.resolutionButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const size = parseInt(e.target.dataset.size)
                this.setResolution(size)
            })
        })

        // Tool buttons
        this.toolButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.dataset.tool
                this.setTool(tool)
            })
        })

        // Undo/Redo buttons
        this.undoBtn.addEventListener('click', () => this.editor.undo())
        this.redoBtn.addEventListener('click', () => this.editor.redo())

        // Preview controls
        this.playButton.addEventListener('click', () => {
            this.animator.toggle()
            this.updatePlayButton()
        })

        this.scrubSlider.addEventListener('input', (e) => {
            const offset = parseInt(e.target.value)
            this.animator.setOffset(offset)
        })

        this.speedInput.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value)
            this.animator.setSpeed(speed)
        })

        this.thresholdMode.addEventListener('change', () => {
            this.renderPreview()
        })

        this.thresholdValue.addEventListener('input', (e) => {
            this.thresholdDisplay.textContent = e.target.value
            this.renderPreview()
        })

        // Export buttons
        this.exportJsonBtn.addEventListener('click', () => {
            this.exportJSON()
        })

        this.exportPbmBtn.addEventListener('click', () => {
            this.exportPBM()
        })

        // Custom events
        document.addEventListener('renderFrame', (e) => {
            this.renderPreview()
        })

        document.addEventListener('levelChanged', (e) => {
            // Update UI when editor level changes
            this.updateUI()
        })

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e)
        })

        // Animator offset change callback
        this.animator.setOnOffsetChange((offset) => {
            this.scrubSlider.value = offset
        })

        // Window resize handler
        window.addEventListener('resize', () => {
            this.editor.resizeCanvas()
            this.editor.render()
            this.renderPreview()
        })
    }

    setResolution(size) {
        // Update active resolution button
        this.resolutionButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.size == size)
        })

        // Resize buffer and update editor
        this.buffer.resize(size, size)
        this.editor.resizeBuffer(size, size)
        this.editor.resizeCanvas() // Resize canvas for new buffer
        this.animator.updateBuffer(this.buffer)
        this.createPaletteSelector()
        this.renderPreview()
    }

    setTool(tool) {
        // Update active tool button
        this.toolButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tool === tool)
        })

        // Set editor tool
        this.editor.setTool(tool)
    }

    handleKeyboard(event) {
        // Prevent default for our shortcuts
        if (event.metaKey || event.ctrlKey) {
            switch (event.key) {
                case 'z':
                    if (event.shiftKey) {
                        event.preventDefault()
                        this.editor.redo()
                    } else {
                        event.preventDefault()
                        this.editor.undo()
                    }
                    break
                case 'y':
                    event.preventDefault()
                    this.editor.redo()
                    break
            }
        } else {
            switch (event.key) {
                case ' ':
                    event.preventDefault()
                    this.animator.toggle()
                    this.updatePlayButton()
                    break
                case 'ArrowLeft':
                    event.preventDefault()
                    this.animator.step(-1)
                    break
                case 'ArrowRight':
                    event.preventDefault()
                    this.animator.step(1)
                    break
            }
        }
    }

    updatePlayButton() {
        if (this.animator.getPlaying()) {
            this.playButton.textContent = 'Pause'
        } else {
            this.playButton.textContent = 'Play'
        }
    }

    updateUI() {
        // Update levels display
        this.levelsDisplay.textContent = this.buffer.levels
        this.levelsSlider.value = this.buffer.levels

        // Update scrub slider max
        this.scrubSlider.max = this.buffer.levels - 1

        // Update speed display
        this.speedInput.value = this.animator.getSpeed()

        // Update threshold display
        this.thresholdDisplay.textContent = this.thresholdValue.value
    }

    renderPreview() {
        const threshold = parseInt(this.thresholdValue.value)
        const thresholdMode = this.thresholdMode.value
        const offset = this.animator.getOffset()

        this.renderer.render(this.buffer, offset, threshold, thresholdMode)
    }

    exportJSON() {
        const filename = this.exporter.generateFilename('cyclelab-project', 'json')
        this.exporter.exportJSON(this.buffer, filename)
    }

    async exportPBM() {
        const threshold = parseInt(this.thresholdValue.value)

        // Simple format selection
        const formatChoice = prompt('Select PBM format:\n1. P1 (ASCII)\n2. P4 (Binary)\n\nEnter 1 or 2:')

        if (formatChoice === '1') {
            const filename = this.exporter.generateFilename('cyclelab-export', 'pbm')
            this.exporter.exportPBM(this.buffer, threshold, 'P1', filename)
        } else if (formatChoice === '2') {
            const filename = this.exporter.generateFilename('cyclelab-export', 'pbm')
            this.exporter.exportPBM(this.buffer, threshold, 'P4', filename)
        }
    }

    createPaletteSelector() {
        // Clear existing palette
        this.paletteContainer.innerHTML = ''

        // Create palette colors
        for (let i = 0; i < this.buffer.levels; i++) {
            const colorDiv = document.createElement('div')
            colorDiv.className = 'palette-color'
            colorDiv.dataset.level = i

            // Calculate color value (inverted: 0 = white, max = black)
            const grayValue = Math.round(((this.buffer.levels - 1 - i) * 255) / (this.buffer.levels - 1))
            colorDiv.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`

            // Add active class for current level
            if (i === this.editor.getLevel()) {
                colorDiv.classList.add('active')
            }

            // Add click handler
            colorDiv.addEventListener('click', () => {
                this.setPaletteLevel(i)
            })

            this.paletteContainer.appendChild(colorDiv)
        }
    }

    setPaletteLevel(level) {
        this.editor.setLevel(level)

        // Update active palette color
        const paletteColors = this.paletteContainer.querySelectorAll('.palette-color')
        paletteColors.forEach((color, index) => {
            color.classList.toggle('active', index === level)
        })
    }

    // Initialize the app
    init() {
        console.log('CycleLab initialized')
        this.renderPreview()
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new CycleLabApp()
    app.init()
})
