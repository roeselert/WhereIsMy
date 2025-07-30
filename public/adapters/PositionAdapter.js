class PositionAdapter {
    constructor() {
        this.options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        };
    }

    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!("geolocation" in navigator)) {
                alert("Geolocation not supported");
                reject(new Error('Geolocation not supported'));
                return;
            }

            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                reject(new Error('Geolocation requires HTTPS or localhost'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    const coordinates = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    resolve(coordinates);
                },
                error => {
                    alert('Geolocation error: ' + error.code);
                    reject(error);
                },
                this.options
            );
        });
    }

    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
}