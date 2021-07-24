import { useState, ReactNode } from 'react';
import {
  TrashIcon,
  CheckIcon,
  PlusIcon,
  PencilIcon,
  XIcon,
} from '@heroicons/react/outline';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@reach/disclosure';
import { animated, useSpring } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import { FormattedMessage } from 'react-intl';
import { Tooltip } from '@reach/tooltip';
import Interweave from 'interweave';
import { UrlMatcher } from 'interweave-autolink';

import type { Item } from '../db';

interface ListItemProps {
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ActiveItemsList({
  items,
  ...props
}: {
  items: Item[];
} & ListItemProps) {
  return (
    <ul className="divide-y divide-gray-200">
      {items.map((item) => (
        <ListItem key={item.id} item={item} {...props} />
      ))}
    </ul>
  );
}

export function CheckedOffItemsList({
  items,
  ...props
}: {
  items: Item[];
} & ListItemProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <Disclosure>
      <DisclosureButton>{items.length} checked off</DisclosureButton>
      <DisclosurePanel as="ul" className="divide-y divide-gray-200">
        {items.map((item) => (
          <ListItem key={item.id} item={item} {...props} />
        ))}
      </DisclosurePanel>
    </Disclosure>
  );
}

function ListItem({
  item: { id, title, note, checked },
  onToggle,
  onRemove,
  onOpen,
}: { item: Item } & ListItemProps) {
  const [swipe, setSwipe] = useState(0);
  const CheckedIcon = checked ? PlusIcon : CheckIcon;
  const isChecking = swipe === 1;
  const isRemoving = swipe === -1;

  return (
    <li className="group py-4 flex">
      {isChecking && (
        <div className="flex justify-between flex-grow relative pointer-events-auto bg-blue-500">
          <button type="button" onClick={() => onToggle(id, !checked)}>
            <CheckedIcon className="h-8 w-8 m-2 text-white" />
            <span className="sr-only">
              <FormattedMessage defaultMessage="Check" id="RDZVQL" />
            </span>
          </button>
          <button type="button" onClick={() => setSwipe(0)}>
            <XIcon className="h-8 w-8 m-2 text-white" />
            <span className="sr-only">
              <FormattedMessage defaultMessage="Cancel" id="47FYwb" />
            </span>
          </button>
        </div>
      )}
      {isRemoving && (
        <div className="flex justify-between flex-grow relative pointer-events-auto bg-red-500">
          <button type="button" onClick={() => setSwipe(0)}>
            <XIcon className="h-8 w-8 m-2 text-white" />
            <span className="sr-only">
              <FormattedMessage defaultMessage="Remove" id="G/yZLu" />
            </span>
          </button>
          <button type="button" onClick={() => onRemove(id)}>
            <TrashIcon className="h-8 w-8 m-2 text-white" />
            <span className="sr-only">
              <FormattedMessage defaultMessage="Cancel" id="47FYwb" />
            </span>
          </button>
        </div>
      )}
      {!isChecking && !isRemoving && (
        <Slider
          CheckedIcon={CheckedIcon}
          onTap={() => onOpen(id)}
          swipe={setSwipe}
        >
          <div role="button" className="ml-3 flex-grow">
            <p
              className={`text-lg text-gray-900 ${
                checked ? 'line-through' : ''
              }`}
            >
              {title}
            </p>
            <p className="text-sm text-gray-500">
              <Interweave
                content={note}
                matchers={[new UrlMatcher('url', { customTLDs: ['dev'] })]}
                newWindow={true}
              />
            </p>
          </div>

          <Tooltip label="Add note">
            <button
              className="ml-3 pointer-events-auto opacity-0 md:group-hover:opacity-100 transition duration-200 ease-in-out"
              type="button"
              onClick={() => onOpen(id)}
            >
              <PencilIcon className="hover:text-blue-500 h-6 w-6" />
              <span className="sr-only">
                <FormattedMessage defaultMessage="Edit" id="wEQDC6" />
              </span>
            </button>
          </Tooltip>

          <Tooltip label="Check item">
            <button
              className="ml-3 pointer-events-auto opacity-0 md:group-hover:opacity-100 transition duration-200 ease-in-out"
              type="button"
              onClick={() => onToggle(id, !checked)}
            >
              <CheckedIcon className="hover:text-green-500 h-6 w-6" />
              <span className="sr-only">
                <FormattedMessage defaultMessage="Check" id="RDZVQL" />
              </span>
            </button>
          </Tooltip>

          <Tooltip label="Delete item">
            <button
              className="ml-3 pointer-events-auto opacity-0 md:group-hover:opacity-100 transition duration-200 ease-in-out"
              type="button"
              onClick={() => onRemove(id)}
            >
              <TrashIcon className="hover:text-red-500 h-6 w-6" />
              <span className="sr-only">
                <FormattedMessage defaultMessage="Remove" id="G/yZLu" />
              </span>
            </button>
          </Tooltip>
        </Slider>
      )}
    </li>
  );
}

function Slider({
  swipe,
  onTap,
  CheckedIcon,
  children,
}: {
  swipe: (position: number) => void;
  onTap?: () => void;
  CheckedIcon: typeof PlusIcon | typeof CheckIcon;
  children: ReactNode[];
}) {
  const [isRemoving, setRemoving] = useState(false);
  const [{ x }, spring] = useSpring<{ x: number }>(() => ({
    x: 0,
  }));
  const bind = useDrag(
    ({ down, movement: [mx], swipe: [swipeX], tap, event }) => {
      const isSVG = event.target instanceof SVGElement;
      if (tap && onTap && !isSVG) {
        onTap();
      }
      spring.start({
        x: down ? mx : 0,
        immediate: down,
      });
      swipe(swipeX);
      setRemoving(mx < 0);
    },
    {
      axis: 'x',
      lockDirection: true,
      delay: 500,
      useTouch: true,
      swipeDuration: 500,
      swipeVelocity: 0.1,
      filterTaps: true,
    }
  );

  return (
    <animated.div
      {...bind()}
      className={`flex justify-between flex-grow relative pointer-events-auto md:pointer-events-none bg-gradient-to-r ${
        isRemoving ? 'from-red-300 to-red-500' : 'from-blue-500 to-blue-300'
      }`}
    >
      <CheckedIcon className="h-8 w-8 m-2 text-white" />
      <TrashIcon className="h-8 w-8 m-2 text-white" />
      <animated.div
        className="bg-white w-full absolute inset-0 flex"
        style={{
          transform: x.to((x) => `translate3d(${x}px,0,0)`),
        }}
      >
        {children}
      </animated.div>
    </animated.div>
  );
}
