// Luvima Advanced Image Editor JavaScript

class LuvimaEditor {
    constructor() {
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.previewImg = document.getElementById('previewImg');
        this.fileInput = document.getElementById('fileInput');
        this.uploadPlaceholder = document.getElementById('uploadPlaceholder');
        this.filterSlider = document.getElementById('filterSlider');
        this.container = document.getElementById('container');
        this.loading = document.getElementById('loading');

        
        this.originalImage = null;
        this.currentImage = null;
        this.filters = {
            brightness: 100,
            saturation: 100,
            inversion: 0,
            grayscale: 0,
            blur: 0,
            contrast: 100,
            opacity: 100,
            sepia: 0,
            sharpen: 0,
            'border-radius': 0
        };
        
        this.currentFilter = 'brightness';
        this.rotation = 0;
        this.flipHorizontal = false;
        this.flipVertical = false;
        this.cropMode = false;
        this.cropStart = null;
        this.cropEnd = null;
        this.aspectRatioLocked = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.hideLoading();
    }
    
    setupEventListeners() {
        // File input handling
        this.fileInput.addEventListener('change', (e) => this.loadImage(e));
        document.getElementById('chooseBtn').addEventListener('click', () => this.fileInput.click());
        document.getElementById('chooseImageLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.fileInput.click();
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectFilter(e.target.dataset.filter));
        });
        
        // Filter slider
        this.filterSlider.addEventListener('input', (e) => this.updateFilter(e.target.value));
        
        // Rotate and flip buttons
        document.querySelectorAll('.rotate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTransform(e.target.closest('.rotate-btn').dataset.action));
        });
        
        // Control buttons
        document.getElementById('resetBtn').addEventListener('click', () => this.resetImage());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveImage());
        document.getElementById('cropBtn').addEventListener('click', () => this.toggleCropMode());
        
        // Aspect ratio lock
        document.getElementById('aspectRatioLock').addEventListener('change', (e) => {
            this.aspectRatioLocked = e.target.checked;
        });
        
        // Canvas events for cropping
        this.canvas.addEventListener('mousedown', (e) => this.startCrop(e));
        this.canvas.addEventListener('mousemove', (e) => this.updateCrop(e));
        this.canvas.addEventListener('mouseup', (e) => this.endCrop(e));
        
        // Navbar toggle
        window.toggleNavbar = () => {
            const navbar = document.getElementById('navbar');
            navbar.classList.toggle('active');
        };
        
        // Drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        const dropZone = this.uploadPlaceholder;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }
    
    showLoading() {
        this.loading.style.display = 'flex';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
    }
    
    loadImage(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }
    
    handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }
        
        this.showLoading();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.setupCanvas();
                this.showEditor();
                this.applyFilters();
                this.hideLoading();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas() {
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = this.originalImage;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
    }
    
    showEditor() {
        this.uploadPlaceholder.style.display = 'none';
        this.canvas.style.display = 'block';
        this.previewImg.style.display = 'none';
        this.container.classList.remove('disable');
    }
    
    selectFilter(filterName) {
        // Remove active class from all buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        event.target.classList.add('active');
        
        this.currentFilter = filterName;
        
        // Update slider based on current filter value
        const currentValue = this.filters[filterName];
        this.filterSlider.value = currentValue;
        
        // Update slider range based on filter type
        this.updateSliderRange(filterName);
        
        // Update UI
        this.updateFilterDisplay();
    }
    
    updateSliderRange(filterName) {
        const ranges = {
            brightness: { min: 0, max: 200, step: 1 },
            saturation: { min: 0, max: 200, step: 1 },
            inversion: { min: 0, max: 100, step: 1 },
            grayscale: { min: 0, max: 100, step: 1 },
            blur: { min: 0, max: 10, step: 0.1 },
            contrast: { min: 0, max: 200, step: 1 },
            opacity: { min: 0, max: 100, step: 1 },
            sepia: { min: 0, max: 100, step: 1 },
            sharpen: { min: 0, max: 100, step: 1 },
            'border-radius': { min: 0, max: 50, step: 1 }
        };
        
        const range = ranges[filterName];
        this.filterSlider.min = range.min;
        this.filterSlider.max = range.max;
        this.filterSlider.step = range.step;
    }
    
    updateFilter(value) {
        this.filters[this.currentFilter] = parseFloat(value);
        this.updateFilterDisplay();
        this.applyFilters();
    }
    
    updateFilterDisplay() {
        const filterName = this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1);
        const value = this.filters[this.currentFilter];
        
        document.querySelector('.filter-name').textContent = filterName;
        
        let displayValue;
        if (['brightness', 'saturation', 'contrast'].includes(this.currentFilter)) {
            displayValue = Math.round(value) + '%';
        } else if (this.currentFilter === 'blur') {
            displayValue = value.toFixed(1) + 'px';
        } else if (this.currentFilter === 'border-radius') {
            displayValue = Math.round(value) + 'px';
        } else {
            displayValue = Math.round(value) + '%';
        }
        
        document.querySelector('.value').textContent = displayValue;
    }
    
    applyFilters() {
        if (!this.originalImage) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.save();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.rotation * Math.PI / 180);
        this.ctx.scale(this.flipHorizontal ? -1 : 1, this.flipVertical ? -1 : 1);
        this.ctx.translate(-centerX, -centerY);
        
        // Apply CSS filters
        const filterString = this.buildFilterString();
        this.ctx.filter = filterString;
        
        // Draw image
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.restore();
        
        // Apply border radius if needed
        if (this.filters['border-radius'] > 0) {
            this.applyBorderRadius();
        }
    }
    
    buildFilterString() {
        const f = this.filters;
        return `brightness(${f.brightness}%) saturate(${f.saturation}%) invert(${f.inversion}%) grayscale(${f.grayscale}%) blur(${f.blur}px) contrast(${f.contrast}%) opacity(${f.opacity}%) sepia(${f.sepia}%)`;
    }
    
    applyBorderRadius() {
        const radius = this.filters['border-radius'];
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        for (let y = 0; y < this.canvas.height; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const distanceFromCorner = this.getDistanceFromCorner(x, y, this.canvas.width, this.canvas.height, radius);
                
                if (distanceFromCorner > radius) {
                    const index = (y * this.canvas.width + x) * 4;
                    data[index + 3] = 0; // Set alpha to 0 (transparent)
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    getDistanceFromCorner(x, y, width, height, radius) {
        const corners = [
            [radius, radius],
            [width - radius, radius],
            [width - radius, height - radius],
            [radius, height - radius]
        ];
        
        for (let corner of corners) {
            const dx = x - corner[0];
            const dy = y - corner[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if ((x < radius && y < radius) || 
                (x > width - radius && y < radius) || 
                (x > width - radius && y > height - radius) || 
                (x < radius && y > height - radius)) {
                return distance;
            }
        }
        
        return 0;
    }
    
    handleTransform(action) {
        switch (action) {
            case 'rotate-left':
                this.rotation -= 90;
                break;
            case 'rotate-right':
                this.rotation += 90;
                break;
            case 'flip-horizontal':
                this.flipHorizontal = !this.flipHorizontal;
                break;
            case 'flip-vertical':
                this.flipVertical = !this.flipVertical;
                break;
        }
        
        this.applyFilters();
    }
    
    toggleCropMode() {
        this.cropMode = !this.cropMode;
        const cropBtn = document.getElementById('cropBtn');
        
        if (this.cropMode) {
            cropBtn.textContent = 'Cancel Crop';
            cropBtn.classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else {
            cropBtn.textContent = 'Crop Image';
            cropBtn.classList.remove('active');
            this.canvas.style.cursor = 'default';
        }
    }
    
    startCrop(e) {
        if (!this.cropMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.cropStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    updateCrop(e) {
        if (!this.cropMode || !this.cropStart) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.cropEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.drawCropOverlay();
    }
    
    endCrop(e) {
        if (!this.cropMode || !this.cropStart) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.cropEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.performCrop();
    }
    
    drawCropOverlay() {
        this.applyFilters();
        
        if (this.cropStart && this.cropEnd) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.cropStart.x,
                this.cropStart.y,
                this.cropEnd.x - this.cropStart.x,
                this.cropEnd.y - this.cropStart.y
            );
        }
    }
    
    performCrop() {
        if (!this.cropStart || !this.cropEnd) return;
        
        const x = Math.min(this.cropStart.x, this.cropEnd.x);
        const y = Math.min(this.cropStart.y, this.cropEnd.y);
        const width = Math.abs(this.cropEnd.x - this.cropStart.x);
        const height = Math.abs(this.cropEnd.y - this.cropStart.y);
        
        if (width < 10 || height < 10) return;
        
        const imageData = this.ctx.getImageData(x, y, width, height);
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.putImageData(imageData, 0, 0);
        
        this.toggleCropMode();
        this.cropStart = null;
        this.cropEnd = null;
    }
    
    resetImage() {
        if (!this.originalImage) return;
        
        // Reset all filters
        this.filters = {
            brightness: 100,
            saturation: 100,
            inversion: 0,
            grayscale: 0,
            blur: 0,
            contrast: 100,
            opacity: 100,
            sepia: 0,
            sharpen: 0,
            'border-radius': 0
        };
        
        // Reset transformations
        this.rotation = 0;
        this.flipHorizontal = false;
        this.flipVertical = false;
        
        // Reset canvas
        this.setupCanvas();
        
        // Reset UI
        this.currentFilter = 'brightness';
        this.filterSlider.value = 100;
        this.updateFilterDisplay();
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="brightness"]').classList.add('active');
        
        this.applyFilters();
    }
    
    saveImage() {
        if (!this.canvas) return;
        
        const link = document.createElement('a');
        link.download = `luvima-edited-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
    
    // Remove background (placeholder - would need actual AI service)
    async removeBg() {
    if (!this.originalImage) return;
    
    this.showLoading();

    try {
        // Convert canvas image to Blob
        const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));

        // Prepare form data
        const formData = new FormData();
        formData.append('image', blob, 'image.png');

        // Send to your Flask or 3rd party AI API (update this URL!)
        const response = await fetch('http://localhost:5000/remove-bg', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Background removal failed');

        // Get result as Blob and render it on canvas
        const resultBlob = await response.blob();
        const imgURL = URL.createObjectURL(resultBlob);
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.currentImage = img;
            this.setupCanvas();
            this.applyFilters();
            this.hideLoading();
        };
        img.src = imgURL;

    } catch (err) {
        console.error(err);
        alert('Error removing background: ' + err.message);
        this.hideLoading();
    }
}

}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LuvimaEditor();
});

// Navbar smooth scrolling
document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Close navbar on mobile when clicking outside
document.addEventListener('click', (e) => {
    const navbar = document.getElementById('navbar');
    const toggle = document.querySelector('.navbar-toggle');
    
    if (!navbar.contains(e.target) && !toggle.contains(e.target)) {
        navbar.classList.remove('active');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'o':
                e.preventDefault();
                document.getElementById('fileInput').click();
                break;
            case 's':
                e.preventDefault();
                document.getElementById('saveBtn').click();
                break;
            case 'z':
                e.preventDefault();
                document.getElementById('resetBtn').click();
                break;
        }
    }
});

// Responsive canvas handling
window.addEventListener('resize', () => {
    const editor = window.LuvimaEditor;
    if (editor && editor.originalImage) {
        editor.setupCanvas();
        editor.applyFilters();
    }
});

// Touch events for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Swipe gestures could be added here for mobile navigation
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

