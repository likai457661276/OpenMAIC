import packageJson from '@/package.json';
import { CLASSROOM_ZIP_FORMAT_VERSION } from '@/lib/export/classroom-zip-types';

export function getOpenMaicVersionPayload() {
  return {
    appVersion: packageJson.version,
    zipFormatVersion: CLASSROOM_ZIP_FORMAT_VERSION,
  };
}
