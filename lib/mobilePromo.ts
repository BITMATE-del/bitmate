export type MobilePromoConfig = {
  qrUrl: string;
  qrImage: string | null;
  qrTitle: string;
  qrDescription: string;
  qrButtonLabel: string;
  qrButtonUrl: string;
};

export const mobilePromo: MobilePromoConfig = {
  qrUrl: '/app',
  qrImage: null,
  qrTitle: 'Scan to open',
  qrDescription: '모바일 브라우저에서 BITMATE를 바로 확인하세요.',
  qrButtonLabel: 'Open Web App',
  qrButtonUrl: '/app'
};
