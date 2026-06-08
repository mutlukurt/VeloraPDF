import { useWindowDimensions } from "react-native";

export function getDeviceClass(width: number, height: number) {
  return {
    isPhone: width < 600,
    isTablet: width >= 600,
    isLargeTablet: width >= 840,
    isLandscape: width > height
  };
}

export function useDeviceClass() {
  const { width, height } = useWindowDimensions();
  return { width, height, ...getDeviceClass(width, height) };
}
