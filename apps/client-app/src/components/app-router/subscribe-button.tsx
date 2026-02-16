'use client';

import { useTrackCustomEvent } from 'next-cwv-monitor/app-router';
import { toast } from 'sonner';
import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { BaseCustomEventButton } from '../shared/custom-event-button';

type Props = Omit<ComponentPropsWithoutRef<typeof BaseCustomEventButton>, 'useTrackHook' | 'eventName'>;

export default function SubscribeButton({ onClick, ...props }: Props) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    toast.success('Subscribed!');
    onClick?.(event);
  };

  return (
    <BaseCustomEventButton
      {...props}
      type={props.type ?? 'button'}
      eventName="subscribe"
      useTrackHook={useTrackCustomEvent}
      className={
        'cursor-pointer rounded bg-black px-4 py-2 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed'
      }
      onClick={handleClick}
    />
  );
}
