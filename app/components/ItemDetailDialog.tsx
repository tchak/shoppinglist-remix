import { DialogContent, DialogOverlay } from '@reach/dialog';
import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useFetcher } from 'remix';

import type { Item } from '~/lib/dto';

export function ItemDetailDialog({
  item,
  onDismiss,
}: {
  item: Item;
  onDismiss: () => void;
}) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.type == 'done') {
      onDismiss();
    }
  }, [fetcher.type, onDismiss]);

  return (
    <DialogOverlay
      className="fixed z-10 inset-0 overflow-y-auto"
      onDismiss={onDismiss}
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-32 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <DialogContent
          className="inline-block align-bottom bg-white rounded-lg p-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <fetcher.Form action={`/items/${item.id}`} method="put" replace>
            <div>
              <div className="text-center">
                <h3
                  className="text-lg leading-6 font-medium text-gray-900"
                  id="modal-headline"
                >
                  {item.title}
                </h3>
                <div className="mt-4">
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    autoCorrect="off"
                    autoComplete="off"
                    className="max-w-lg shadow-sm block w-full focus:ring-green-500 focus:border-green-500 sm:text-sm border-gray-300 rounded-md"
                    defaultValue={item.note ?? ''}
                    placeholder="Add more information about the item"
                    disabled={fetcher.state == 'submitting'}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="submit"
                disabled={fetcher.state == 'submitting'}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm"
              >
                <FormattedMessage defaultMessage="OK" id="kAEQyV" />
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                onClick={onDismiss}
                disabled={fetcher.state == 'submitting'}
              >
                <FormattedMessage defaultMessage="Cancel" id="47FYwb" />
              </button>
            </div>
          </fetcher.Form>
        </DialogContent>
      </div>
    </DialogOverlay>
  );
}
