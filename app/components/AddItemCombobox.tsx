import { PlusIcon } from '@heroicons/react/solid';
import {
  Combobox,
  ComboboxInput,
  ComboboxList,
  ComboboxOption,
  ComboboxPopover,
} from '@reach/combobox';
import { FormEvent, useEffect, useState } from 'react';
import { useFetcher } from 'remix';
import { useDebounce } from 'use-debounce';

export function AddItemCombobox({
  onSelect,
}: {
  onSelect: (value: string) => void;
}) {
  const [term, setTerm] = useState('');
  const items = useItemSuggestions(term);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (term.length >= 2) {
      onSelect(titleize(term));
      setTerm('');
    }
  };

  return (
    <form className="mt-2" onSubmit={onSubmit}>
      <Combobox
        className="flex"
        aria-labelledby="Add Item"
        onSelect={(value) => {
          onSelect(value);
          setTerm('');
        }}
      >
        <label htmlFor="item-title">
          <PlusIcon className="h-10 w-10 text-gray-400" />
        </label>
        <ComboboxInput
          id="item-title"
          type="text"
          placeholder="Add Item"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="shadow-sm focus:ring-green-500 focus:border-green-500 flex-grow sm:text-sm border-gray-300 rounded-md"
          value={term}
          onChange={({ currentTarget: { value } }) => setTerm(value)}
        />
        {items && (
          <ComboboxPopover className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
            <ComboboxList persistSelection className="py-1">
              {items.length > 0 ? (
                items.map((value) => (
                  <ComboboxOption
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    key={value}
                    value={value}
                  />
                ))
              ) : (
                <ComboboxOption
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  value={term}
                />
              )}
            </ComboboxList>
          </ComboboxPopover>
        )}
      </Combobox>
    </form>
  );
}

function useItemSuggestions(term: string): string[] {
  const fetcher = useFetcher<string[]>();
  const [debouncedTerm] = useDebounce(term, 200);
  useEffect(() => {
    if (debouncedTerm.trim() != '') {
      fetcher.submit({ term: debouncedTerm }, { action: '/items' });
    }
  }, [fetcher, debouncedTerm]);
  return fetcher.data ?? [];
}

function titleize(input: string) {
  return input.toLowerCase().replace(/(?:^|\s|-)\S/g, (x) => x.toUpperCase());
}
