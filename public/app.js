class WhereIsMyApp {
    constructor() {
        this.photoRepository = new PhotoRepository();
        this.positionAdapter = new PositionAdapter();
        this.cameraAdapter = new CameraAdapter();
        this.initApp();
    }

    async initApp() {
        await this.photoRepository.init();
        this.setupEventListeners();
        this.loadPhotos();
        this.startCamera();
    }


    setupEventListeners() {
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
    }

    async startCamera() {
        try {
            this.updateStatus('Starting camera...');
            const stream = await this.cameraAdapter.startCamera();
            
            const video = document.getElementById('video');
            video.srcObject = stream;
            
            document.getElementById('startCameraBtn').style.display = 'none';
            document.getElementById('captureBtn').style.display = 'block';
            this.updateStatus('Camera ready. Tap capture to take photo.');
        } catch (error) {
            this.updateStatus(error.message);
            document.getElementById('startCameraBtn').style.display = 'block';
            document.getElementById('captureBtn').style.display = 'none';
        }
    }


    async capturePhoto() {
        try {
            this.updateStatus('Capturing photo...');
            
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            
            const imageDataURL = this.cameraAdapter.capturePhoto(video, canvas);
            
            let coordinates = null;
            try {
                coordinates = await this.positionAdapter.getCurrentPosition();
            } catch (error) {
                console.warn('Could not get location:', error.message);
            }
            
            const photoData = {
                image: imageDataURL,
                coordinates: coordinates,
                timestamp: Date.now(),
                formattedDate: new Date().toLocaleString()
            };
            
            await this.photoRepository.save(photoData);
            this.loadPhotos();
            this.updateStatus('Photo captured!');
            
        } catch (error) {
            console.error('Capture error:', error);
            this.updateStatus(`Error capturing photo: ${error.message || 'Please try again.'}`);
        }
    }


    async loadPhotos() {
        try {
            const photos = await this.photoRepository.getAll();
            this.displayPhotos(photos);
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }


    displayPhotos(photos) {
        const photoList = document.getElementById('photoList');
        
        if (photos.length === 0) {
            photoList.innerHTML = '<p class="empty-state">No photos captured yet</p>';
            return;
        }

        photoList.innerHTML = photos.map(photo => `
            <div class="photo-item" data-id="${photo.id}">
                <img src="${photo.image}" alt="Captured photo" class="photo-thumbnail">
                <div class="photo-info">
                    <div class="photo-date">${photo.formattedDate}</div>
                    ${photo.coordinates ? `
                        <div class="photo-coordinates">
                            📍 ${photo.coordinates.latitude.toFixed(6)}, ${photo.coordinates.longitude.toFixed(6)}
                        </div>
                        <div class="photo-accuracy">Accuracy: ±${Math.round(photo.coordinates.accuracy)}m</div>
                        <div class="photo-actions">
                            <button onclick="app.openInMaps(${photo.coordinates.latitude}, ${photo.coordinates.longitude})">
                                🗺️ Open in Maps
                            </button>
                            <button onclick="app.deletePhoto(${photo.id})" class="delete-btn">
                                🗑️ Delete
                            </button>
                        </div>
                    ` : `
                        <div class="photo-coordinates">📍 Location disabled</div>
                        <div class="photo-actions">
                            <button onclick="app.deletePhoto(${photo.id})" class="delete-btn">
                                🗑️ Delete
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `).join('');
    }

    openInMaps(lat, lng) {
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank');
    }

    async deletePhoto(id) {
        if (!confirm('Delete this photo?')) return;
        
        try {
            await this.photoRepository.delete(id);
            
            this.loadPhotos();
            this.updateStatus('Photo deleted');
        } catch (error) {
            console.error('Delete error:', error);
            this.updateStatus('Error deleting photo');
        }
    }

    updateStatus(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status show';
        
        setTimeout(() => {
            status.className = 'status';
        }, 3000);
    }
}

const app = new WhereIsMyApp();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    });
}