/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import PrimaryLayout from 'modules/app/components/layout/layouts/Primary';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';

const SwaggerUI: any = dynamic(() => import('swagger-ui-react'), { ssr: false });

import { HeadComponent } from 'modules/app/components/layout/Head';
import 'swagger-ui-react/swagger-ui.css';
import { Box, useColorMode } from 'theme-ui';
import { createSwaggerSpec } from 'next-swagger-doc';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const ApiDoc = ({ spec }: InferGetStaticPropsType<typeof getStaticProps>): JSX.Element => {
  const [mode] = useColorMode();
  const router = useRouter();

  // Strip query parameters if present
  useEffect(() => {
    if (Object.keys(router.query).length > 0) {
      router.replace('/api-docs', undefined, { shallow: true });
    }
  }, [router]);

  return (
    <PrimaryLayout sx={{ maxWidth: [null, null, null, 'page', 'dashboard'] }}>
      <HeadComponent title="API Docs" />
      <Box
        sx={{
          '.swagger-ui': {
            filter: mode === 'dark' ? 'invert(88%) hue-rotate(180deg)' : 'none',
            '.highlight-code': {
              filter: mode === 'dark' ? 'invert(100%) hue-rotate(180deg)' : 'none'
            }
          }
        }}
      >
        <SwaggerUI spec={spec} />
      </Box>
    </PrimaryLayout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const spec: Record<string, any> = createSwaggerSpec({
    title: 'Governance Portal Swagger',
    version: '0.1.0'
  });

  return {
    props: {
      spec
    }
  };
};

export default ApiDoc;
