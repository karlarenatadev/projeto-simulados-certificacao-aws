[Skip to content](https://pglite.dev/docs/#VPContent)

On this page

# Getting started with PGlite [​](https://pglite.dev/docs/\#getting-started-with-pglite)

PGlite can be used in both Node/Bun/Deno or the browser, and with any JavaScript framework.

## Install and start in Node/Bun/Deno [​](https://pglite.dev/docs/\#install-and-start-in-node-bun-deno)

Install into your project:

npmpnpmyarnbundeno

bash

```
npm install @electric-sql/pglite
```

bash

```
pnpm install @electric-sql/pglite
```

bash

```
yarn add @electric-sql/pglite
```

bash

```
bun install @electric-sql/pglite
```

bash

```
deno add npm:@electric-sql/pglite
```

To use the in-memory Postgres:

js

```
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
```

or to persist to the native filesystem:

js

```
const db = new PGlite('./path/to/pgdata')
```

## Install and start in the browser [​](https://pglite.dev/docs/\#install-and-start-in-the-browser)

It can be installed and imported using your usual package manager:

js

```
import { PGlite } from '@electric-sql/pglite'
```

or using a CDN such as JSDeliver:

js

```
import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js'
```

Then for an in-memory Postgres:

js

```
const db = new PGlite()
```

or to persist the database to IndexedDB:

js

```
const db = new PGlite('idb://my-pgdata')
```

## Making a query [​](https://pglite.dev/docs/\#making-a-query)

There are two methods for querying the database, `.query` and `.exec`. The former supports parameters, while the latter supports multiple statements.

First, let's create a table and insert some test data using the `.exec` method:

js

```
await db.exec(`
  CREATE TABLE IF NOT EXISTS todo (
    id SERIAL PRIMARY KEY,
    task TEXT,
    done BOOLEAN DEFAULT false
  );
  INSERT INTO todo (task, done) VALUES ('Install PGlite from NPM', true);
  INSERT INTO todo (task, done) VALUES ('Load PGlite', true);
  INSERT INTO todo (task, done) VALUES ('Create a table', true);
  INSERT INTO todo (task, done) VALUES ('Insert some data', true);
  INSERT INTO todo (task) VALUES ('Update a task');
`)
```

The `.exec` method is perfect for migrations and batch inserts with raw SQL.

Now, let's retrieve an item using `.query` method:

js

```
const ret = await db.query(`
  SELECT * from todo WHERE id = 1;
`)
console.log(ret.rows)
```

Output:

js

```
;[\
  {\
    id: 1,\
    task: 'Install PGlite from NPM',\
    done: false,\
  },\
]
```

## Using parameterised queries [​](https://pglite.dev/docs/\#using-parameterised-queries)

When working with user supplied values, it's always best to use parameterized queries; these are supported on the `.query` method.

We can use this to update a task:

js

```
const ret = await db.query(
  'UPDATE todo SET task = $2, done = $3 WHERE id = $1',
  [5, 'Update a task using parameterized queries', true],
)
```

## What next? [​](https://pglite.dev/docs/\#what-next)

- To learn more about [querying](https://pglite.dev/docs/api#query) and [transactions](https://pglite.dev/docs/api#transaction) along with the other methods and options available, you can read the main [PGlite API documentation](https://pglite.dev/docs/api).

- There is also a [live-query extension](https://pglite.dev/docs/live-queries) that enables reactive queries to update a UI when the underlying database changes.

- PGlite has a number of built-in [virtual file systems](https://pglite.dev/docs/filesystems) to provide persistence for your database.

- There are [framework hooks](https://pglite.dev/docs/framework-hooks/react) to make working with PGlite within React and Vue much easier with less boilerplate.

- For help configuring PGlite with your bundler, see the [bundler support](https://pglite.dev/docs/bundler-support) page.

- As PGlite only has a single exclusive connection to the database, we provide a [multi-tab worker](https://pglite.dev/docs/multi-tab-worker) to enable sharing a PGlite instance between multiple browser tabs.

- There is a [REPL component](https://pglite.dev/docs/repl) that can be easily embedded into a web-app to aid in debugging and development, or as part of a database application itself.

- We maintain a [list of ORMs and query builders](https://pglite.dev/docs/orm-support) that support PGlite.

- PGlite supports both Postgres extensions and PGlite Plugins via its [extensions API](https://pglite.dev/docs/api#options-extensions), and there is a list of [supported extensions](https://pglite.dev/extensions/).

- We have a [page of examples](https://pglite.dev/examples) that you can open to test out PGlite in the browser.