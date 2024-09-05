type DefaultArgType = Record<string, unknown>;
type DefaultReturnType = any;

/**
 * low level fetch function which handles error handling
 * @param func async function to be called
 * @returns
 */
function makeFetch<ArgType = DefaultArgType, ReturnType = DefaultReturnType>(
  func: (args: ArgType) => ReturnType
) {
  return async (args: ArgType) => {
    try {
      return await func(args);
    } catch (error) {
      let errorMsg = '';
      // assumes axios error response
      if (error.response) {
        console.error(error.response.data);
        errorMsg = `[${error.response.status}][${error.response.data?.error?.type}]: ${error.response.data?.error?.message}`;
      } else {
        errorMsg = error.message;
      }
      return Promise.resolve({ errorMsg });
    }
  };
}
