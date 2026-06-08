import { getDeviceClass } from "./breakpoints";

export function describeOrientation(width: number, height: number) {
  const device = getDeviceClass(width, height);
  if (device.isPhone) return device.isLandscape ? "phone-landscape" : "phone";
  if (device.isLargeTablet && device.isLandscape) return "large-tablet-landscape";
  return device.isLandscape ? "tablet-landscape" : "tablet-portrait";
}
