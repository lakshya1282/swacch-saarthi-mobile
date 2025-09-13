/**
 * Geocoding utilities for converting between coordinates and addresses
 */

// Using Nominatim (OpenStreetMap) for free geocoding
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Cache for storing geocoded addresses to reduce API calls
const addressCache = new Map();

/**
 * Convert coordinates to a human-readable address
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<string>} Human-readable address
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    // Check cache first
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (addressCache.has(cacheKey)) {
      return addressCache.get(cacheKey);
    }

    // Make API request to Nominatim
    const response = await fetch(
      `${NOMINATIM_API}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'WasteManagementApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();
    
    // Format the address based on available data
    let address = '';
    
    if (data.address) {
      const parts = [];
      
      // Add house number and road
      if (data.address.house_number) {
        parts.push(data.address.house_number);
      }
      if (data.address.road) {
        parts.push(data.address.road);
      } else if (data.address.street) {
        parts.push(data.address.street);
      }
      
      // Add area/suburb
      if (data.address.suburb) {
        parts.push(data.address.suburb);
      } else if (data.address.neighbourhood) {
        parts.push(data.address.neighbourhood);
      } else if (data.address.quarter) {
        parts.push(data.address.quarter);
      }
      
      // Add city
      if (data.address.city) {
        parts.push(data.address.city);
      } else if (data.address.town) {
        parts.push(data.address.town);
      } else if (data.address.village) {
        parts.push(data.address.village);
      }
      
      // Add state
      if (data.address.state) {
        parts.push(data.address.state);
      }
      
      // Add postal code
      if (data.address.postcode) {
        parts.push(data.address.postcode);
      }
      
      address = parts.filter(Boolean).join(', ');
    }
    
    // Fallback to display name if address formatting fails
    if (!address && data.display_name) {
      address = data.display_name;
    }
    
    // If still no address, use coordinates
    if (!address) {
      address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
    
    // Cache the result
    addressCache.set(cacheKey, address);
    
    return address;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Return formatted coordinates as fallback
    return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
  }
};

/**
 * Convert an address to coordinates
 * @param {string} address - Human-readable address
 * @returns {Promise<{latitude: number, longitude: number}>} Coordinates
 */
export const geocode = async (address) => {
  try {
    const response = await fetch(
      `${NOMINATIM_API}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'WasteManagementApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    throw new Error('No results found');
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Format coordinates for display when address is not available
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {string} Formatted coordinate string
 */
export const formatCoordinates = (latitude, longitude) => {
  return `${latitude.toFixed(4)}°${latitude >= 0 ? 'N' : 'S'}, ${longitude.toFixed(4)}°${longitude >= 0 ? 'E' : 'W'}`;
};

/**
 * Get a simplified address (just area and city)
 * @param {string} fullAddress - Full address string
 * @returns {string} Simplified address
 */
export const simplifyAddress = (fullAddress) => {
  if (!fullAddress) return '';
  
  // Split by comma and take relevant parts
  const parts = fullAddress.split(',').map(p => p.trim());
  
  // Try to get area and city (usually 2nd and 3rd or 3rd and 4th parts)
  if (parts.length >= 3) {
    return `${parts[1]}, ${parts[2]}`;
  }
  
  return fullAddress;
};

/**
 * Batch reverse geocode multiple coordinates
 * @param {Array<{latitude: number, longitude: number}>} coordinates - Array of coordinate objects
 * @returns {Promise<Array<string>>} Array of addresses
 */
export const batchReverseGeocode = async (coordinates) => {
  const promises = coordinates.map(coord => 
    reverseGeocode(coord.latitude, coord.longitude)
  );
  
  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error('Batch reverse geocoding error:', error);
    // Return coordinate strings as fallback
    return coordinates.map(coord => 
      formatCoordinates(coord.latitude, coord.longitude)
    );
  }
};

// Pre-populate cache with common Bangalore locations (example)
const preloadCommonLocations = () => {
  addressCache.set('12.9716,77.5946', 'MG Road, Bangalore, Karnataka, 560001');
  addressCache.set('12.9352,77.6245', 'Koramangala, Bangalore, Karnataka, 560034');
  addressCache.set('12.9698,77.7500', 'Whitefield, Bangalore, Karnataka, 560066');
  addressCache.set('12.9784,77.6408', 'Indiranagar, Bangalore, Karnataka, 560038');
  addressCache.set('13.0358,77.5970', 'Hebbal, Bangalore, Karnataka, 560024');
};

// Initialize cache with common locations
preloadCommonLocations();

export default {
  reverseGeocode,
  geocode,
  formatCoordinates,
  simplifyAddress,
  batchReverseGeocode
};
