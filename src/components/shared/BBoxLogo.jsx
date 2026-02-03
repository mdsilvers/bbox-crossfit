import React from 'react';

const BBoxLogo = ({ className = "w-10 h-10" }) => (
  <img
    src="/bbox-logo.png"
    alt="BBOX CrossFit"
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export default BBoxLogo;
