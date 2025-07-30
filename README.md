# Topic Tangle

Topic Tangle is an application for easily organizing and inspiring group discussions. Organizers create a room of topics where users can choose which they're interested in. Afterwards, the app will create breakout groups based on users' overlapping topics and provide LLM-generated icebreaker questions.

## Project Layout

The project is organized into the following major components:

- **Frontend**: Built with SvelteKit, located in the `app/` directory.
- **Backend**: Includes a mock backend for local development and a Google Cloud Function backend for production, located in the `backend/` directory.

## Environment Configuration

Ensure the relevant `.env` files are populated with the necessary environment variables before running the application. Refer to the `.env.example` files for guidance on required variables.

## Frontend

The frontend is built with SvelteKit and uses Vite for development and builds.

### Development

1. Navigate to the `app/` directory:
   ```bash
   cd app
   ```
2. Install dependencies:
   ```bash
   npm i -D
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Build

To create a production build:
```bash
npm run build
```

## Backend

The backend provides APIs for managing rooms, user selections, and breakout groups. It supports two implementations:

1. **Mock Backend**: For rapid local development and testing. Uses an in-memory datastore.
2. **Google Cloud Function Backend**: Wraps the mock backend in a serverless google cloud function for production. Uses a gcloud datastore.

For development, you can run either the mock backend or the cloud function backend locally. Running the cloud function backend locally requires the `gcloud` CLI tool and a datastore instance (which can be emulated with `gcloud`).

### Mock Backend

1. Navigate to the `backend/mock/` directory:
   ```bash
   cd backend/mock
   ```
2. Install dependencies:
   ```bash
   npm i -D
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

### Google Cloud Function Backend

1. Navigate to the `backend/gcloud/function/` directory:
   ```bash
   cd backend/gcloud/function
   ```
2. Install dependencies:
   ```bash
   npm i -D
   ```
3. Deploy the function:
   ```bash
   ./deploy.sh
   ```