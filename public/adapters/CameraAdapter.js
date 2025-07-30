class CameraAdapter {
    constructor() {
        this.stream = null;
        this.constraints = {
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            return this.stream;
        } catch (error) {
            console.error('Camera error:', error);
            throw new Error('Camera access denied. Please enable camera permissions.');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    capturePhoto(videoElement, canvasElement) {
        const ctx = canvasElement.getContext('2d');
        
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        return canvasElement.toDataURL('image/jpeg', 0.8);
    }

    setConstraints(newConstraints) {
        this.constraints = { ...this.constraints, ...newConstraints };
    }
}