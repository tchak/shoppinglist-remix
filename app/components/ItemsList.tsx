import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@heroicons/react/outline';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@reach/disclosure';
import { Tooltip } from '@reach/tooltip';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { BooleanFromString } from 'io-ts-types-experimental/Decoder';
import { ReactNode, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { animated, useSpring } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import { Form, useFetcher } from 'remix';

import type { Item } from '~/lib/dto';

interface ListItemProps {
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
  list,
  items,
  ...props
}: {
  list: { id: string };
  items: Item[];
} & ListItemProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <Disclosure>
      <div className="flex justify-between items-center mt-2 mb-4">
        <DisclosureButton className="underline">
          {items.length} checked off
        </DisclosureButton>
        <Form action="/items" method="delete" replace>
          <input type="hidden" value={list.id} name="list" />
          <button className="underline" type="submit">
            Clear checked off
          </button>
        </Form>
      </div>
      <DisclosurePanel as="ul" className="divide-y divide-gray-200">
        {items.map((item) => (
          <ListItem key={item.id} item={item} {...props} />
        ))}
      </DisclosurePanel>
    </Disclosure>
  );
}

function useItemSubmit(id: string) {
  const toggle = useFetcher();
  const remove = useFetcher();
  const onToggle = (checked: boolean) =>
    toggle.submit(
      { checked: checked ? 'true' : 'false' },
      { action: `/items/${id}`, method: 'put', replace: true }
    );
  const onRemove = () =>
    remove.submit(null, {
      action: `/items/${id}`,
      method: 'delete',
      replace: true,
    });

  return {
    onToggle,
    onRemove,
    transitions: { toggle, remove },
  };
}

function ListItem({ item, onOpen }: { item: Item } & ListItemProps) {
  const {
    onToggle,
    onRemove,
    transitions: { toggle },
  } = useItemSubmit(item.id);
  const [swipe, setSwipe] = useState(0);
  const checked =
    toggle.type == 'actionSubmission' || toggle.type == 'actionReload'
      ? pipe(
          BooleanFromString.decode(toggle.submission.formData.get('checked')),
          E.getOrElse(() => false)
        )
      : item.checked;
  const CheckedIcon = checked ? PlusIcon : CheckIcon;
  const isChecking = swipe === 1;
  const isRemoving = swipe === -1;

  return (
    <li className="group py-4 flex">
      {isChecking && (
        <div className="flex justify-between flex-grow relative pointer-events-auto bg-blue-500">
          <button type="button" onClick={() => onToggle(!checked)}>
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
          <button type="button" onClick={() => onRemove()}>
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
          onTap={() => onOpen(item.id)}
          swipe={setSwipe}
        >
          <div role="button" className="ml-3 flex-grow">
            <p
              className={`text-lg text-gray-900 ${
                checked ? 'line-through' : ''
              }`}
            >
              {item.title}
            </p>
            <p className="text-sm text-gray-500">{item.note}</p>
          </div>

          {!checked ? (
            <Tooltip label="Add note">
              <button
                className="ml-3 pointer-events-auto opacity-0 md:group-hover:opacity-100 transition duration-200 ease-in-out"
                type="button"
                onClick={() => onOpen(item.id)}
              >
                <PencilIcon className="hover:text-blue-500 h-6 w-6" />
                <span className="sr-only">
                  <FormattedMessage defaultMessage="Edit" id="wEQDC6" />
                </span>
              </button>
            </Tooltip>
          ) : null}

          <Tooltip label={checked ? 'Uncheck item' : 'Check item'}>
            <button
              className="ml-3 pointer-events-auto opacity-0 md:group-hover:opacity-100 transition duration-200 ease-in-out"
              type="button"
              onClick={() => onToggle(!checked)}
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
              onClick={() => onRemove()}
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
