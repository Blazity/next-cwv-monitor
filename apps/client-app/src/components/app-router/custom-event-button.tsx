'use client';
import { useTrackCustomEvent } from 'next-cwv-monitor/app-router';
import { ComponentPropsWithoutRef } from 'react';
import { BaseCustomEventButton } from '../shared/custom-event-button';

type Props = Omit<ComponentPropsWithoutRef<typeof BaseCustomEventButton>, 'useTrackHook'>;

export default function CustomEventButton(props: Props) {
  return (
    <BaseCustomEventButton
      {...props}
      useTrackHook={useTrackCustomEvent}
      className={props.className ?? "bg-black text-white px-4 py-2 rounded"}
    />
  );
}