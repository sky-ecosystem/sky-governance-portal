'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Box, useColorMode } from 'theme-ui';
import skyBgLight from '../../../public/assets/bg_medium.jpg';
import skyBgDark from '../../../public/assets/bg_dark_medium.png';

export const ThemeImage = () => {
  const [clientMode, setClientMode] = useState<string>('light');
  const [mode] = useColorMode();

  useEffect(() => {
    if (mode) {
      setClientMode(mode);
    }
  }, [mode]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        overflow: 'hidden'
      }}
    >
      <Image
        src={skyBgLight}
        alt="light-sky-background"
        fill
        style={{ objectFit: 'cover', display: clientMode === 'light' ? 'block' : 'none' }}
        placeholder="blur"
        quality={100}
      />
      <Image
        src={skyBgDark}
        alt="dark-sky-background"
        fill
        style={{ objectFit: 'cover', display: clientMode === 'dark' ? 'block' : 'none' }}
        placeholder="blur"
        quality={100}
      />
    </Box>
  );
};
