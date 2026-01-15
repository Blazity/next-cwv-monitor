import { ComponentPropsWithoutRef, MouseEvent } from 'react';

type TrackCustomEventOptions = {
  route?: string;
  path?: string;
  recordedAt?: string;
};
type TrackCustomEvent = (name: string, options?: TrackCustomEventOptions) => void;

interface BaseProps extends ComponentPropsWithoutRef<'button'> {
  eventName: string;
  eventOptions?: TrackCustomEventOptions;
  useTrackHook: () => TrackCustomEvent;
}

export function BaseCustomEventButton({
  children,
  eventName,
  eventOptions,
  className,
  onClick,
  useTrackHook,
  ...props
}: BaseProps) {
  const trackEvent = useTrackHook();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    trackEvent(eventName, {
      ...eventOptions
    });

    onClick?.(event);
  };

  return (
    <button className={className} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
