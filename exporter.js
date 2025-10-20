// Exporter Module - JSON and PBM (P1/P4) File Generation

export class Exporter {
    constructor() {
        // Export formats
        this.formats = {
            JSON: 'application/json',
            PBM_P1: 'image/x-portable-bitmap',
            PBM_P4: 'image/x-portable-bitmap',
        }
    }

    // Export buffer as JSON project file
    exportJSON(buffer, filename = 'cyclelab-project.json') {
        const projectData = {
            version: 1,
            width: buffer.width,
            height: buffer.height,
            levels: buffer.levels,
            pixels: [...buffer.pixels],
        }

        const jsonString = JSON.stringify(projectData, null, 2)
        this.downloadFile(jsonString, filename, this.formats.JSON)
    }

    // Export buffer as PBM (Portable Bitmap) file
    exportPBM(buffer, threshold = 128, format = 'P1', filename = 'cyclelab-export.pbm') {
        if (format === 'P1') {
            this.exportPBM_P1(buffer, threshold, filename)
        } else if (format === 'P4') {
            this.exportPBM_P4(buffer, threshold, filename)
        }
    }

    // Export as P1 (ASCII) format
    exportPBM_P1(buffer, threshold, filename) {
        const lines = []
        lines.push('P1')
        lines.push(`${buffer.width} ${buffer.height}`)

        // Convert pixels to 1-bit using threshold
        for (let y = 0; y < buffer.height; y++) {
            const row = []
            for (let x = 0; x < buffer.width; x++) {
                const pixelIndex = y * buffer.width + x
                const pixelValue = buffer.pixels[pixelIndex]
                // Invert palette: level 0 = white (255), max level = black (0)
                const grayValue = Math.round(((buffer.levels - 1 - pixelValue) * 255) / (buffer.levels - 1))
                const bit = grayValue >= threshold ? 1 : 0
                row.push(bit.toString())
            }
            lines.push(row.join(' '))
        }

        const pbmContent = lines.join('\n')
        this.downloadFile(pbmContent, filename, this.formats.PBM_P1)
    }

    // Export as P4 (binary) format
    exportPBM_P4(buffer, threshold, filename) {
        // P4 header
        const header = `P4\n${buffer.width} ${buffer.height}\n`

        // Calculate bytes needed (8 pixels per byte)
        const bytesPerRow = Math.ceil(buffer.width / 8)
        const totalBytes = bytesPerRow * buffer.height
        const data = new Uint8Array(totalBytes)

        // Convert pixels to packed binary data
        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const pixelIndex = y * buffer.width + x
                const pixelValue = buffer.pixels[pixelIndex]
                // Invert palette: level 0 = white (255), max level = black (0)
                const grayValue = Math.round(((buffer.levels - 1 - pixelValue) * 255) / (buffer.levels - 1))
                const bit = grayValue >= threshold ? 1 : 0

                // Calculate byte and bit position
                const byteIndex = y * bytesPerRow + Math.floor(x / 8)
                const bitPosition = 7 - (x % 8) // PBM uses MSB first

                if (bit) {
                    data[byteIndex] |= 1 << bitPosition
                }
            }
        }

        // Combine header and binary data
        const headerBytes = new TextEncoder().encode(header)
        const combinedData = new Uint8Array(headerBytes.length + data.length)
        combinedData.set(headerBytes, 0)
        combinedData.set(data, headerBytes.length)

        // Create blob and download
        const blob = new Blob([combinedData], { type: 'application/octet-stream' })
        this.downloadBlob(blob, filename)
    }

    // Import JSON project file
    importJSON(fileContent) {
        try {
            const projectData = JSON.parse(fileContent)

            // Validate project data
            if (!this.validateProjectData(projectData)) {
                throw new Error('Invalid project file format')
            }

            return projectData
        } catch (error) {
            throw new Error(`Failed to import project: ${error.message}`)
        }
    }

    // Validate project data structure
    validateProjectData(data) {
        return (
            data &&
            typeof data.version === 'number' &&
            typeof data.width === 'number' &&
            typeof data.height === 'number' &&
            typeof data.levels === 'number' &&
            Array.isArray(data.pixels) &&
            data.pixels.length === data.width * data.height &&
            data.pixels.every((p) => typeof p === 'number' && p >= 0 && p < data.levels)
        )
    }

    // Create buffer from project data
    createBufferFromProject(projectData) {
        const buffer = {
            width: projectData.width,
            height: projectData.height,
            levels: projectData.levels,
            pixels: [...projectData.pixels],
        }
        return buffer
    }

    // Download file content
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType })
        this.downloadBlob(blob, filename)
    }

    // Download blob
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Generate filename with timestamp
    generateFilename(prefix, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        return `${prefix}-${timestamp}.${extension}`
    }

    // Get file extension for format
    getExtension(format) {
        switch (format) {
            case 'P1':
            case 'P4':
                return 'pbm'
            case 'JSON':
                return 'json'
            default:
                return 'txt'
        }
    }

    // Format selection dialog
    async showFormatDialog() {
        // Simple format selection - in a real app this could be a modal
        const format = prompt(
            'Select export format:\n1. P1 (ASCII PBM)\n2. P4 (Binary PBM)\n3. JSON (Project file)\n\nEnter 1, 2, or 3:'
        )

        switch (format) {
            case '1':
                return { type: 'P1', format: 'P1' }
            case '2':
                return { type: 'P4', format: 'P4' }
            case '3':
                return { type: 'JSON', format: 'JSON' }
            default:
                return null
        }
    }

    // Handle file input for import
    handleFileInput(file, callback) {
        const reader = new FileReader()

        reader.onload = (event) => {
            try {
                const content = event.target.result

                if (file.name.toLowerCase().endsWith('.json')) {
                    const projectData = this.importJSON(content)
                    callback(null, projectData)
                } else {
                    callback(new Error('Unsupported file format. Please use .json files.'))
                }
            } catch (error) {
                callback(error)
            }
        }

        reader.onerror = () => {
            callback(new Error('Failed to read file'))
        }

        reader.readAsText(file)
    }
}
