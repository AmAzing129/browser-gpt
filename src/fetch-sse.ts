type FetchParams = Parameters<typeof fetch>;
import { streamAsyncIterable } from "./stream-async-iterable";

const parseEventStream = (str: string) =>
  str
    .trim()
    .split(/\n\s*\n/)
    .map((item) => item.substring(6));

export async function fetchSSE(
  url: string,
  options: FetchParams[1] & { onMessage: (data: string) => void }
) {
  const { onMessage, ...fetchOptions } = options;

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    const { error } = JSON.parse(await res.text());
    const { message } = error;
    throw new Error(message);
  }

  if (!res.body) return;

  for await (const chunk of streamAsyncIterable(res.body)) {
    const text = new TextDecoder().decode(chunk);
    const parsedArr = parseEventStream(text);
    for (let str of parsedArr) {
      if (str === "[DONE]") return;
      const { delta } = JSON.parse(str).choices[0];
      if (delta.content) onMessage?.(delta.content);
    }
  }
}
