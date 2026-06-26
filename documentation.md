# Smart Splitter Documentation

## What this project is

This is a small React app with an Express backend. It helps groups keep track of shared expenses, calculate who owes what, and view group balances.

The app stores data in a local JSON file during development, so it is easy to run without a database.

## What it does

- Saves users, groups, expenses, and payments
- Shows a dashboard with group totals and member debts
- Lets users add and remove expenses
- Lets users invite group members
- Shows details for each group
- Includes a simple AI assistant area
- Has a premium/billing screen

## Main files

- `package.json` - dependencies and commands
- `server.ts` - Express server and API logic
- `vite.config.ts` - Vite setup for the app
- `src/App.tsx` - main React app logic
- `src/types.ts` - shared TypeScript types
- `src/components/` - page and UI components
- `index.html` - HTML shell for Vite
- `data/` - local JSON data stored at runtime

## How to run it

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` or `.env.local` file if you need environment variables.

3. Add this variable if you want AI features:
   - `GEMINI_API_KEY`

4. Start the app:
   ```bash
   npm run dev
   ```

5. Open the browser at:
   - `http://localhost:3000`

## Useful commands

- `npm run dev` - run the app locally
- `npm run build` - build the frontend and bundle the server
- `npm run start` - run the built app
- `npm run clean` - delete build files
- `npm run lint` - check TypeScript types

## Important files in more detail

### `server.ts`

This starts the backend server and:

- listens on port `3000`
- loads env variables with `dotenv`
- reads and writes `data/db.json`
- contains sample users, groups, and expenses
- calculates debts between members
- serves the frontend in production mode

### `src/App.tsx`

This is the main React app. It:

- keeps track of the current user
- loads dashboard and group data
- handles adding and deleting expenses
- handles inviting members and settling debts
- switches between dashboard, group details, and other screens

### `src/types.ts`

This file defines the data shapes used in the app:

- `User`
- `Group`
- `Expense`
- `Debt`
- `SplitStrategy`
- `ChatMessage`

### `vite.config.ts`

This sets up Vite for React and Tailwind, and includes a path alias.

### `src/components/`

- `Sidebar.tsx` - side navigation and groups list
- `AuthPage.tsx` - sign in screen
- `Dashboard.tsx` - main overview page
- `GroupDetail.tsx` - group expense details
- `AnalyticsPanel.tsx` - charts and insights
- `AIAssistant.tsx` - AI help panel
- `PremiumBilling.tsx` - premium plan page
- `AddExpenseModal.tsx` - modal to add a new expense

## Data model summary

- `User` holds profile and optional payment info
- `Group` holds members and group details
- `Expense` stores amount, payer, split type, and shares
- `Debt` shows who owes who

## Notes

- This app uses a local JSON file for data, so it is best for development.
- If port `3000` is busy, stop the other app or change the port.
- The app can still run without the AI key, but AI features may not work.

## Suggestions

- Add a `.env.example` file for required variables
- Add `data/` to `.gitignore` if you want to keep runtime data local
- Add tests for backend and frontend behavior
- Consider splitting dev startup commands for server and frontend if needed
