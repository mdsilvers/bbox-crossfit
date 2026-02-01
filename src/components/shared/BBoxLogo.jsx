import React from 'react';

const BBoxLogo = ({ className = "w-10 h-10" }) => (
  <img
    src="https://www.antarescatamarans.com/wp-content/uploads/2026/01/BBOX-New-BarBell-smallest.png"
    alt="BBOX CrossFit"
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export default BBoxLogo;
