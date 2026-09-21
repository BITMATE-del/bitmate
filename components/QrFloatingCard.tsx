'use client';

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import type { MobilePromoConfig } from '@/lib/mobilePromo';
import s from './LandingProductPreview.module.css';

type Props = MobilePromoConfig;

export default function QrFloatingCard({
  qrUrl,
  qrImage,
  qrTitle,
  qrDescription,
  qrButtonLabel,
  qrButtonUrl
}: Props){
  return (
    <aside className={s.quickAccess} aria-label="BITMATE mobile quick access">
      <div className={s.qr}>
        {qrImage ? (
          <img className={s.qrImage} src={qrImage} alt="BITMATE QR code" />
        ) : (
          <QRCodeSVG
            value={qrUrl}
            size={152}
            level="M"
            bgColor="#f1f5f4"
            fgColor="#0a0d0e"
            includeMargin={false}
            className={s.qrSvg}
          />
        )}
      </div>
      <small>QUICK ACCESS</small>
      <b>{qrTitle}</b>
      <p>{qrDescription}</p>
      <Link href={qrButtonUrl}>{qrButtonLabel} →</Link>
    </aside>
  );
}
