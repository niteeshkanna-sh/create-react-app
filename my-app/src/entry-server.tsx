import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import App from './App';

/**
 * The site rendered to HTML at build time, one route at a time.
 *
 * The page used to be served as an empty <div id="root"> with a 300 KB script
 * beside it, so nothing at all was on screen until that script had been
 * fetched, parsed and run -- about three seconds on a mid-range phone on a
 * rural connection, which is most of this site's visitors. Everything Google
 * measures a page by happens in that window, and all of it was waiting on
 * work the visitor did not need done to read a headline.
 *
 * Now the words and the layout are in the file the server sends. The script
 * still loads and takes over -- that is what makes the fleet list and the
 * enquiry form work -- but by then the page has been readable for two and a
 * half seconds.
 *
 * prerenderToNodeStream rather than renderToString, because the routes are
 * loaded with React.lazy now: renderToString cannot wait for a component that
 * suspends and would render the fallback into the HTML for every page but the
 * home page, which is the opposite of the point. This waits for them.
 */
/* react-dom's bundled types describe the prelude as a web ReadableStream, and
   the Node build hands back a Node one. Described structurally rather than
   pulled in from node:stream, so this file needs no @types/node to compile
   alongside the browser code it sits with. */
type NodeReadable = AsyncIterable<string> & { setEncoding(encoding: string): void };

export async function render(url: string): Promise<string> {
  const { prelude } = await prerenderToNodeStream(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );

  const stream = prelude as unknown as NodeReadable;
  stream.setEncoding('utf8');

  let html = '';
  for await (const chunk of stream) html += chunk;
  return html;
}
