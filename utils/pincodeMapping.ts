/**
 * Pincode → State mapping for Indian pincodes.
 * Uses first 2 digits of pincode to determine state.
 * Covers all Indian states and UTs.
 */

const PINCODE_STATE_MAP: Record<string, string> = {
  '11': 'Delhi',
  '12': 'Haryana',
  '13': 'Punjab',
  '14': 'Punjab',
  '15': 'Himachal Pradesh',
  '16': 'Jammu & Kashmir',
  '17': 'Himachal Pradesh',
  '18': 'Jammu & Kashmir',
  '19': 'Jammu & Kashmir',
  '20': 'Uttar Pradesh',
  '21': 'Uttar Pradesh',
  '22': 'Uttar Pradesh',
  '23': 'Uttar Pradesh',
  '24': 'Uttar Pradesh',
  '25': 'Uttar Pradesh',
  '26': 'Uttarakhand',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '30': 'Rajasthan',
  '31': 'Rajasthan',
  '32': 'Rajasthan',
  '33': 'Tamil Nadu',
  '34': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Gujarat',
  '39': 'Gujarat',
  '40': 'Maharashtra',
  '41': 'Maharashtra',
  '42': 'Maharashtra',
  '43': 'Maharashtra',
  '44': 'Maharashtra',
  '45': 'Madhya Pradesh',
  '46': 'Madhya Pradesh',
  '47': 'Madhya Pradesh',
  '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',
  '50': 'Telangana',
  '51': 'Andhra Pradesh',
  '52': 'Andhra Pradesh',
  '53': 'Andhra Pradesh',
  '56': 'Karnataka',
  '57': 'Karnataka',
  '58': 'Karnataka',
  '59': 'Karnataka',
  '60': 'Tamil Nadu',
  '61': 'Tamil Nadu',
  '62': 'Tamil Nadu',
  '63': 'Tamil Nadu',
  '64': 'Tamil Nadu',
  '67': 'Kerala',
  '68': 'Kerala',
  '69': 'Kerala',
  '70': 'West Bengal',
  '71': 'West Bengal',
  '72': 'West Bengal',
  '73': 'West Bengal',
  '74': 'West Bengal',
  '75': 'Odisha',
  '76': 'Odisha',
  '77': 'Assam',
  '78': 'Assam',
  '79': 'Northeast',
  '80': 'Bihar',
  '81': 'Bihar',
  '82': 'Jharkhand',
  '83': 'Jharkhand',
  '84': 'Bihar',
  '85': 'Bihar',
  '90': 'Andaman & Nicobar',
};

const ZONE_MAP: Record<string, string> = {
  'Delhi': 'Northern',
  'Haryana': 'Northern',
  'Punjab': 'Northern',
  'Himachal Pradesh': 'Northern',
  'Jammu & Kashmir': 'Northern',
  'Uttarakhand': 'Northern',
  'Uttar Pradesh': 'Northern',
  'Rajasthan': 'Western',
  'Gujarat': 'Western',
  'Maharashtra': 'Western',
  'Madhya Pradesh': 'Central',
  'Chhattisgarh': 'Central',
  'Tamil Nadu': 'Southern',
  'Karnataka': 'Southern',
  'Kerala': 'Southern',
  'Andhra Pradesh': 'Southern',
  'Telangana': 'Southern',
  'West Bengal': 'Eastern',
  'Odisha': 'Eastern',
  'Bihar': 'Eastern',
  'Jharkhand': 'Eastern',
  'Assam': 'Northeastern',
  'Northeast': 'Northeastern',
  'Andaman & Nicobar': 'Islands',
};

export function getStateFromPincode(pincode: string): string {
  if (!pincode || pincode.length < 2) return 'Unknown';
  const prefix2 = pincode.substring(0, 2);
  return PINCODE_STATE_MAP[prefix2] || 'Unknown';
}

export function getZoneFromState(state: string): string {
  return ZONE_MAP[state] || 'Unknown';
}

export function getZoneFromPincode(pincode: string): string {
  const state = getStateFromPincode(pincode);
  return getZoneFromState(state);
}

export function getLocationFromPincode(pincode: string): { state: string; zone: string } {
  const state = getStateFromPincode(pincode);
  const zone = getZoneFromState(state);
  return { state, zone };
}

// Get all states in a zone
export function getStatesInZone(zone: string): string[] {
  return Object.entries(ZONE_MAP)
    .filter(([, z]) => z === zone)
    .map(([state]) => state);
}

// Get all available zones
export function getAllZones(): string[] {
  return [...new Set(Object.values(ZONE_MAP))];
}

// Get all available states
export function getAllStates(): string[] {
  return [...new Set(Object.values(PINCODE_STATE_MAP))].sort();
}
