/**
 * Location Service
 * Handles geolocation functionality with fallback options
 */

class LocationService {
  constructor() {
    this.defaultLocation = {
      latitude: 28.6139,  // Default to Delhi, India
      longitude: 77.2090,
      accuracy: 1000,
      isDefault: true
    };
  }

  /**
   * Get user's current location with various fallback strategies
   * @returns {Promise<Object>} Location object with latitude, longitude, and accuracy
   */
  async getLocationWithFallback() {
    try {
      // First, try to get actual location
      const location = await this.getCurrentLocation();
      return location;
    } catch (error) {
      console.warn('Could not get actual location, using fallback:', error.message);
      
      // Try to get location from IP
      try {
        const ipLocation = await this.getLocationFromIP();
        return ipLocation;
      } catch (ipError) {
        console.warn('Could not get IP location, using default:', ipError.message);
        
        // Return default location as last resort
        return this.defaultLocation;
      }
    }
  }

  /**
   * Get current location using browser's Geolocation API
   * @returns {Promise<Object>} Location object
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
            isDefault: false
          });
        },
        (error) => {
          let errorMessage = 'Unknown error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied the request for Geolocation';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get user location timed out';
              break;
            default:
              errorMessage = error.message;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }

  /**
   * Get approximate location from IP address
   * @returns {Promise<Object>} Location object
   */
  async getLocationFromIP() {
    try {
      // Using a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error('Failed to fetch IP location');
      }

      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 5000, // IP-based location is less accurate
          city: data.city,
          region: data.region,
          country: data.country_name,
          isDefault: false,
          source: 'ip'
        };
      } else {
        throw new Error('Invalid IP location data');
      }
    } catch (error) {
      console.error('Error getting IP location:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format coordinates for display
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted coordinates
   */
  formatCoordinates(latitude, longitude, decimals = 4) {
    const lat = latitude.toFixed(decimals);
    const lon = longitude.toFixed(decimals);
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    
    return `${Math.abs(lat)}°${latDir}, ${Math.abs(lon)}°${lonDir}`;
  }

  /**
   * Get a human-readable address from coordinates (reverse geocoding)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<string>} Address string
   */
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      // Using OpenStreetMap's Nominatim service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'WasteManagementApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();
      
      if (data.display_name) {
        return data.display_name;
      } else if (data.address) {
        // Build address from components
        const parts = [];
        if (data.address.house_number) parts.push(data.address.house_number);
        if (data.address.road) parts.push(data.address.road);
        if (data.address.suburb) parts.push(data.address.suburb);
        if (data.address.city || data.address.town || data.address.village) {
          parts.push(data.address.city || data.address.town || data.address.village);
        }
        if (data.address.state) parts.push(data.address.state);
        if (data.address.postcode) parts.push(data.address.postcode);
        if (data.address.country) parts.push(data.address.country);
        
        return parts.join(', ');
      } else {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Error getting address:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  /**
   * Get coordinates from a human-readable address (forward geocoding)
   * @param {string} address - Human-readable address
   * @returns {Promise<Object>} Location object with latitude and longitude
   */
  async getCoordinatesFromAddress(address) {
    try {
      // Using OpenStreetMap's Nominatim service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'WasteManagementApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          accuracy: 1000, // Address-based location is less accurate than GPS
          address: result.display_name,
          source: 'ADDRESS',
          timestamp: Date.now()
        };
      } else {
        throw new Error('No results found for the address');
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  /**
   * Check if location services are available and enabled
   * @returns {boolean}
   */
  isLocationAvailable() {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permission from the user
   * @returns {Promise<string>} Permission state: 'granted', 'denied', or 'prompt'
   */
  async requestLocationPermission() {
    if (!this.isLocationAvailable()) {
      throw new Error('Geolocation is not supported');
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      console.error('Error checking location permission:', error);
      // Fallback: try to get location to trigger permission prompt
      try {
        await this.getCurrentLocation();
        return 'granted';
      } catch {
        return 'denied';
      }
    }
  }

  /**
   * Watch location changes
   * @param {Function} callback - Function to call when location changes
   * @param {Object} options - Geolocation options
   * @returns {number} Watch ID for clearing the watch
   */
  watchLocation(callback, options = {}) {
    if (!this.isLocationAvailable()) {
      console.error('Geolocation is not supported');
      return null;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const watchOptions = { ...defaultOptions, ...options };

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        console.error('Location watch error:', error);
        callback(null, error);
      },
      watchOptions
    );
  }

  /**
   * Clear location watch
   * @param {number} watchId - ID returned from watchLocation
   */
  clearWatch(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Get location from saved preferences or cache
   * @returns {Object|null} Cached location or null
   */
  getCachedLocation() {
    try {
      const cached = localStorage.getItem('cachedLocation');
      if (cached) {
        const location = JSON.parse(cached);
        const now = Date.now();
        // Check if cache is less than 30 minutes old
        if (location.timestamp && (now - location.timestamp) < 30 * 60 * 1000) {
          return location;
        }
      }
    } catch (error) {
      console.error('Error reading cached location:', error);
    }
    return null;
  }

  /**
   * Save location to cache
   * @param {Object} location - Location object to cache
   */
  cacheLocation(location) {
    try {
      const locationWithTimestamp = {
        ...location,
        timestamp: Date.now()
      };
      localStorage.setItem('cachedLocation', JSON.stringify(locationWithTimestamp));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }
}

// Create and export singleton instance
const locationService = new LocationService();
export default locationService;
