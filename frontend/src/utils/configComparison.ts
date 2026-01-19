import { BoxConfig, BaseplateConfig } from '../types/config';

/**
 * Deep comparison of two config objects
 */
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Compare two BoxConfig objects for equality
 */
export function compareBoxConfigs(config1: BoxConfig | null, config2: BoxConfig | null): boolean {
  if (config1 === null && config2 === null) return true;
  if (config1 === null || config2 === null) return false;
  return deepEqual(config1, config2);
}

/**
 * Compare two BaseplateConfig objects for equality
 */
export function compareBaseplateConfigs(config1: BaseplateConfig | null, config2: BaseplateConfig | null): boolean {
  if (config1 === null && config2 === null) return true;
  if (config1 === null || config2 === null) return false;
  return deepEqual(config1, config2);
}

/**
 * Compare both configs to see if they match
 */
export function compareConfigs(
  box1: BoxConfig | null,
  baseplate1: BaseplateConfig | null,
  box2: BoxConfig | null,
  baseplate2: BaseplateConfig | null
): boolean {
  return compareBoxConfigs(box1, box2) && compareBaseplateConfigs(baseplate1, baseplate2);
}
