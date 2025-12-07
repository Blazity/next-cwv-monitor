export const getDeviceType = () => {
  const ua = navigator.userAgent.toLowerCase();

  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
};

export type DeviceType = ReturnType<typeof getDeviceType>;
