/**
 * Location utilities for the Waste Management Web App
 * Provides consistent GPS/location functionality across the application
 */

export class LocationService {
  constructor() {
    this.watchId = null;
    this.lastKnownLocation = null;
    this.defaultLocation = { 
      latitude: 28.6139, 
      longitude: 77.2090, 
      city: 'New Delhi', 
      country: 'India' 
    };
  }

  /**
   * Check if geolocation is supported by the browser
   */
  isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Get current location with proper error handling and user feedback
   */
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
      showPermissionDialog: true,
      ...options
    };

    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
        return;
      }

      // Show permission dialog if requested
      if (defaultOptions.showPermissionDialog) {
        this.showLocationPermissionDialog();
      }

      const successCallback = (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'GPS'
        };
        
        this.lastKnownLocation = location;
        resolve(location);
      };

      const errorCallback = (error) => {
        console.error('Geolocation error:', error);
        
        let errorMessage = '';
        let errorCode = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorCode = 'PERMISSION_DENIED';
            errorMessage = 'Location access denied by user. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorCode = 'POSITION_UNAVAILABLE';
            errorMessage = 'Location information is unavailable. Please check your GPS or try again.';
            break;
          case error.TIMEOUT:
            errorCode = 'TIMEOUT';
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorCode = 'UNKNOWN_ERROR';
            errorMessage = 'An unknown error occurred while retrieving location.';
            break;
        }

        reject(new Error(`${errorCode}: ${errorMessage}`));
      };

      navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        {
          enableHighAccuracy: defaultOptions.enableHighAccuracy,
          timeout: defaultOptions.timeout,
          maximumAge: defaultOptions.maximumAge
        }
      );
    });
  }

  /**
   * Watch location changes
   */
  watchLocation(callback, errorCallback, options = {}) {
    if (!this.isGeolocationSupported()) {
      errorCallback(new Error('GEOLOCATION_NOT_SUPPORTED'));
      return null;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 60000 // 1 minute
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'GPS'
        };
        
        this.lastKnownLocation = location;
        callback(location);
      },
      errorCallback,
      { ...defaultOptions, ...options }
    );

    return this.watchId;
  }

  /**
   * Stop watching location
   */
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Get location with fallback strategies
   */
  async getLocationWithFallback() {
    try {
      // Try GPS first
      const gpsLocation = await this.getCurrentLocation({
        timeout: 8000,
        showPermissionDialog: true
      });
      return gpsLocation;
    } catch (gpsError) {
      console.warn('GPS failed, trying fallback methods:', gpsError.message);
      
      try {
        // Try IP-based location as fallback
        const ipLocation = await this.getLocationFromIP();
        return ipLocation;
      } catch (ipError) {
        console.warn('IP location failed:', ipError.message);
        
        // Return default location with warning
        return {
          ...this.defaultLocation,
          source: 'DEFAULT',
          warning: 'Using default location. Please enable GPS or enter your location manually.'
        };
      }
    }
  }

  /**
   * Get approximate location from IP address
   */
  async getLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error('IP location service unavailable');
      }
      
      const data = await response.json();
      
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        city: data.city,
        region: data.region,
        country: data.country_name,
        source: 'IP',
        accuracy: 10000 // IP location is less accurate
      };
    } catch (error) {
      throw new Error('Failed to get location from IP: ' + error.message);
    }
  }

  /**
   * Convert coordinates to address (reverse geocoding)
   */
  async reverseGeocode(latitude, longitude) {
    try {
      // Using OpenStreetMap Nominatim API (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      return {
        formatted_address: data.display_name,
        address_components: {
          house_number: data.address?.house_number,
          road: data.address?.road,
          suburb: data.address?.suburb,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          postcode: data.address?.postcode,
          country: data.address?.country
        }
      };
    } catch (error) {
      throw new Error('Failed to convert coordinates to address: ' + error.message);
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Show location permission dialog with instructions
   */
  showLocationPermissionDialog() {
    // This would ideally be handled by the UI component
    console.log('🌍 Location Access Required: Please allow location access when prompted by your browser.');
  }

  /**
   * Get user's last known location
   */
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  /**
   * Clear cached location data
   */
  clearLocationCache() {
    this.lastKnownLocation = null;
  }
}

// Export a singleton instance
export const locationService = new LocationService();

// Export utility functions
export const LocationUtils = {
  /**
   * Format location for display
   */
  formatLocation(location) {
    if (!location) return 'Location unavailable';
    
    const { latitude, longitude, city, source } = location;
    const sourceText = source === 'GPS' ? '📍' : source === 'IP' ? '🌐' : '📍';
    
    if (city) {
      return `${sourceText} ${city} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }
    
    return `${sourceText} ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  },

  /**
   * Check if location is accurate enough
   */
  isLocationAccurate(location, maxAccuracy = 100) {
    return location && location.accuracy && location.accuracy <= maxAccuracy;
  },

  /**
   * Create location object
   */
  createLocation(latitude, longitude, options = {}) {
    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: Date.now(),
      ...options
    };
  }
};

export default locationService;
