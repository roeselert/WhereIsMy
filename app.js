class WhereIsMyApp {
    constructor() {
        this.db = null;
        this.stream = null;
        this.initApp();
    }

    async initApp() {
        await this.initDB();
        this.setupEventListeners();
        this.loadPhotos();
        this.startCamera();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WhereIsMyDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('photos')) {
                    const store = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    setupEventListeners() {
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
    }

    async startCamera() {
        try {
            this.updateStatus('Starting camera...');
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            const video = document.getElementById('video');
            video.srcObject = this.stream;
            
            document.getElementById('startCameraBtn').style.display = 'none';
            document.getElementById('captureBtn').style.display = 'block';
            this.updateStatus('Camera ready. Tap capture to take photo.');
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Camera access denied. Please enable camera permissions.');
            document.getElementById('startCameraBtn').style.display = 'block';
            document.getElementById('captureBtn').style.display = 'none';
        }
    }

    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            // Check if we're on HTTPS or localhost
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                reject(new Error('Geolocation requires HTTPS or localhost'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => resolve(position),
                error => {
                    console.error('Geolocation error:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        });
    }

    async capturePhoto() {
        try {
            this.updateStatus('Capturing photo...');
            
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            const imageDataURL = canvas.toDataURL('image/jpeg', 0.8);
            
            let coordinates = null;
            try {
                const position = await this.getCurrentPosition();
                coordinates = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
            } catch (error) {
                console.warn('Could not get location:', error.message);
            }
            
            const photoData = {
                image: imageDataURL,
                coordinates: coordinates,
                timestamp: Date.now(),
                formattedDate: new Date().toLocaleString()
            };
            
            await this.savePhoto(photoData);
            this.loadPhotos();
            this.updateStatus('Photo captured!');
            
        } catch (error) {
            console.error('Capture error:', error);
            this.updateStatus(`Error capturing photo: ${error.message || 'Please try again.'}`);
        }
    }

    async savePhoto(photoData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.add(photoData);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadPhotos() {
        try {
            const photos = await this.getAllPhotos();
            this.displayPhotos(photos);
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }

    async getAllPhotos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const index = store.index('timestamp');
            const request = index.getAll();
            
            request.onsuccess = () => {
                const photos = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(photos);
            };
            request.onerror = () => reject(request.error);
        });
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
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['photos'], 'readwrite');
                const store = transaction.objectStore('photos');
                const request = store.delete(id);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
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