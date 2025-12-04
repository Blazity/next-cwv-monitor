import { useEffect } from 'react';
import { useConfig } from '../context/config/config.context.js';
import z from 'zod';

export const useCallAuthorized = () => {
  const { fetcher } = useConfig();
  useEffect(() => {
    fetcher
      .fetch({
        endpoint: '/api/protected',
        schema: z.object({ ok: z.literal(true) })
      })
      .then(console.log)
      .catch(() => {
        console.log('Failed');
      });
  }, []);
};
