# gallformers
The gallformers site

## Getting Started
You must have [npm](https://www.npmjs.com/get-npm) installed for any of this to work. Go do that. I highly recommend using a node version manager of some kind.

Now you can run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technical Overview
The whole site is built using [next.js](nextjs.org/). 

### Back-end and Database
The datastore is a [sqlite](https://sqlite.org/index.html) database. The schema can be seen in the [initial migration script](migrations/001-gallformers.sql). The actual DB is committed to the repo. When the server starts the migrations are run. The initial data load was taken from a bunch of CSV files that were exported out of AirTable. The schema from AirTable was very wonky so the [script](data_from_airtable/genSQLfromCSV.py) to import the CSVs is a mess. Once we get a satisfactory initial load this code should no longer be needed and can deleted along with the CSV files.

The APIs for accessing the data from the front-end are implemented in next.js and are mostly called from the server since most pages are static. There are a few pages that make client side data requests. In an attempt to make this delineation clearer  the APIs called from the back-end to fetch data for static page builds are all under [pages/api](pages/api) and the APIs called from the front-end are implemented as hooks in [hooks](hooks/). 

There is a totally separate data curation step that is not discussed here.  The gallformers.sqlite DB that is on the main branch in this repo is the current production data.

### Front-End
The front-end is mostly static pages as we expect most of this data to not change frequently.  next.js is built on [React](https://reactjs.org/) so you will need some familiarity with that to work on the site. The look-and-feel is built with [react-bootstrap](https://react-bootstrap.github.io/). Custom components are placed in the [pages/components](pages/components) directory and global layout components in [pages/layouts](pages/layouts). 

### Production and Staging (non-dev) Deployments
The plan is to use [Vercel](https://vercel.com) to host the main site. This is a WIP so no details yet.

Current thinking is that we will *not* use Vercel for image hosting, however this is an open item.
