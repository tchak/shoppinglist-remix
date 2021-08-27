import { useCallback, useState } from 'react';
import { PencilIcon } from '@heroicons/react/outline';
import { isHotkey } from 'is-hotkey';
import { FormattedMessage } from 'react-intl';
import { useSubmit, useTransition } from 'remix';

const isEnterKey = isHotkey('enter');
const isEscKey = isHotkey('esc');

export function ListTitle({ list }: { list: { id: string; title: string } }) {
  const submit = useSubmit();
  const transition = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const action = `/lists/${list.id}`;
  const title = (transition?.formData?.get('title') as string) ?? list.title;
  const onClick = () => setIsEditing(true);
  const onSubmit = useCallback(
    (value: string) => {
      if (title != value) {
        submit(
          { title: value },
          {
            action,
            method: 'put',
            replace: true,
          }
        );
      }
      setIsEditing(false);
    },
    [submit, action, title]
  );

  if (isEditing && transition.state != 'submitting') {
    return (
      <div>
        <label htmlFor="list-title" className="sr-only">
          <FormattedMessage defaultMessage="List title" id="EthAB9" />
        </label>
        <input
          id="list-title"
          name="title"
          type="text"
          className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full text-lg font-semibold border-gray-300 rounded-md"
          defaultValue={title}
          autoFocus={true}
          onBlur={({ currentTarget: { value } }) => onSubmit(value)}
          onKeyDown={({ nativeEvent, currentTarget: { value } }) => {
            if (isEnterKey(nativeEvent) || isEscKey(nativeEvent)) {
              onSubmit(value);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="group flex py-2 pl-3">
        <div
          className="flex items-center flex-grow text-lg font-semibold"
          onDoubleClick={onClick}
        >
          {title}
        </div>
        <button
          className="px-3 opacity-0 group-hover:opacity-100 transition duration-200 ease-in-out"
          onClick={onClick}
        >
          <PencilIcon className="hover:text-green-500 h-5 w-5" />
        </button>
      </h3>
    </div>
  );
}
