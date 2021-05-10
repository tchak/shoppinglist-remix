import type { ActionFunction, Request } from 'remix';
import { BaseSchema, ValidationError } from 'yup';

type NextActionFunction<Body> = (body: Body) => ReturnType<ActionFunction>;

export function withBody(
  request: Request,
  config: (router: ActionRouter) => void
) {
  const router = new ActionRouter();
  config(router);
  return router.request(request);
}

async function withValidatedBody<Input, Output>(
  request: Request,
  schema: BaseSchema<Input, any, Output>,
  next: NextActionFunction<Output>,
  fallback: NextActionFunction<ValidationError>
) {
  const params = new URLSearchParams(await request.text());
  const body = Object.fromEntries(params);
  try {
    const data = await schema.validate(body);
    // await here allows to throw additional validation errors from the next middleware
    return await next(data);
  } catch (error) {
    if (ValidationError.isError(error)) {
      return fallback(error as ValidationError);
    }
    throw error;
  }
}

class ActionRouter {
  #handlers: Record<string, NextActionFunction<Request>> = {};
  #fallback: NextActionFunction<ValidationError> = (error) => {
    throw error;
  };

  error(fallback: NextActionFunction<ValidationError>) {
    this.#fallback = fallback;
    return this;
  }

  post<Input, Output>(
    schema: BaseSchema<Input, any, Output>,
    next: NextActionFunction<Output>
  ) {
    this.#handlers['post'] = (request: Request) =>
      withValidatedBody(request, schema, next, (error) =>
        this.#fallback(error)
      );
    return this;
  }

  put<Input, Output>(
    schema: BaseSchema<Input, any, Output>,
    next: NextActionFunction<Output>
  ) {
    this.#handlers['put'] = (request: Request) =>
      withValidatedBody(request, schema, next, (error) =>
        this.#fallback(error)
      );
    return this;
  }

  patch<Input, Output>(
    schema: BaseSchema<Input, any, Output>,
    next: NextActionFunction<Output>
  ) {
    this.#handlers['patch'] = (request: Request) =>
      withValidatedBody(request, schema, next, (error) =>
        this.#fallback(error)
      );
    return this;
  }

  delete(next: NextActionFunction<void>) {
    this.#handlers['delete'] = () => next();
    return this;
  }

  request(request: Request): ReturnType<ActionFunction> {
    const callback = this.#handlers[request.method.toLowerCase()];
    if (callback) {
      return callback(request);
    }
    throw new Error(`No handler registered for "${request.method}" method`);
  }
}
