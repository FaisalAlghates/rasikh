import { describe, expect, it } from 'vitest';
import { mapsScriptUrl } from './GoogleEarthView';

describe('the Google 3D view', () => {
  it('loads the Maps JavaScript API with the 3D library and encodes the key', () => {
    const url = mapsScriptUrl('AB/c d');
    expect(url).toBe(
      'https://maps.googleapis.com/maps/api/js?loading=async&key=AB%2Fc%20d&libraries=maps3d',
    );
  });
});
