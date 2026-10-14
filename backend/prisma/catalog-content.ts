// Lesson notes for the micro-learning modules, and extra skill assessments.
// Kept separate from seed-data.ts so the course content is easy to edit.

/** Key points per lesson, in the same order as the lessons in seed-data.ts. */
export const lessonContent: Record<string, string[][]> = {
  "l-react": [
    [
      "A React app is a tree of components. Each component is a function that returns what should appear on screen.",
      "Split a screen into components by responsibility: a component should do one job (show a card, a list, a form field).",
      "Start from a static version of the UI, then add interactivity. This keeps the structure clear before state is involved.",
      "Name components after what they show (OpportunityCard), not how they look (BlueBox).",
    ],
    [
      "Props are inputs passed from a parent to a child. A component must never change its own props.",
      "State is data a component owns and can change, created with useState. Changing state re-renders the component.",
      "Keep state as small as possible: if a value can be calculated from props or other state, calculate it instead of storing it.",
      "When two components need the same state, lift it up to their closest common parent and pass it down as props.",
    ],
    [
      "Render lists with array.map() and give every item a stable, unique key (usually an id from the database).",
      "Never use the array index as a key if items can be added, removed or re-ordered: React would mix up their state.",
      "A controlled input gets its value from state and updates it in onChange, so React is the single source of truth.",
      "For larger forms, a library such as React Hook Form handles values, validation and errors for you.",
    ],
    [
      "useEffect runs code after rendering, for side effects: fetching data, subscriptions, timers.",
      "The dependency array controls when it re-runs. An empty array means only after the first render.",
      "Always clean up (return a function) for timers and subscriptions, otherwise they keep running after the component is gone.",
      "For server data, a library like TanStack Query handles loading, caching, errors and refetching, so you write far fewer effects.",
    ],
    [
      "Build one small feature end to end: a list that loads from an API, a form to add an item, and an empty state.",
      "Handle the three states of server data on every screen: loading, error and success (including an empty list).",
      "Extract reusable pieces (a Card, a Button variant) only once you have used the same pattern twice.",
      "Be ready to explain in an interview why you put state where you did; that is what interviewers usually probe.",
    ],
  ],
  "l-ts": [
    [
      "TypeScript is JavaScript with types. The compiler checks your code before it runs, so many bugs never reach the browser.",
      "Types are documentation that cannot go out of date: hovering over a function tells you exactly what it expects.",
      "Editors use the types for autocomplete and safe renaming across a whole project.",
      "Types disappear when the code is compiled; they cost nothing at runtime.",
    ],
    [
      "Describe the shape of objects with an interface or a type alias: interface User { id: string; email: string }.",
      "Mark optional properties with ? and values that can be missing with | null.",
      "Union types describe a value that can be one of several options: type Role = 'graduate' | 'employer'.",
      "TypeScript narrows unions for you after a check such as if (role === 'graduate') { ... }.",
    ],
    [
      "Generics let one function or type work with many types while keeping them linked: function first<T>(items: T[]): T.",
      "You already use generics every day: Array<string>, Promise<User>, useState<number>.",
      "Add a constraint when you need certain properties: <T extends { id: string }>.",
      "Don't reach for generics too early; a concrete type is easier to read when only one type is ever used.",
    ],
    [
      "Data from an API is unknown until you check it. A type annotation alone does not prove the server sent that shape.",
      "Validate at the boundary with a schema library such as Zod, then infer the TypeScript type from the schema.",
      "Share one set of types (or schemas) between frontend and backend so both sides agree on the contract.",
      "Model error responses too, e.g. { error: string }, so error handling is typed as well.",
    ],
  ],
  "l-sql": [
    [
      "The query planner decides HOW to run your query: which indexes to use, the join order and the join method.",
      "Use EXPLAIN (or EXPLAIN ANALYZE in PostgreSQL) to see the plan and the real timings.",
      "A 'Seq Scan' reads every row in the table. That is fine for small tables but slow for large ones.",
      "Accurate table statistics (ANALYZE) help the planner make good choices.",
    ],
    [
      "An index is a sorted lookup structure that lets the database find rows without scanning the whole table.",
      "Index the columns you filter, join and sort on most often, for example foreign keys like userId.",
      "Composite indexes work left to right: an index on (userId, createdAt) helps WHERE userId = ? ORDER BY createdAt.",
      "Every index slows down inserts and updates a little, so only add the ones your queries actually use.",
    ],
    [
      "Select only the columns you need; SELECT * fetches extra data and can stop index-only scans.",
      "Filter as early as possible so joins work with fewer rows.",
      "Watch out for N+1 queries: fetching a list, then running one extra query per item. Use a join or a single IN (...) query.",
      "Compare EXPLAIN output before and after a change; measure, don't guess.",
    ],
  ],
  "l-azure": [
    [
      "Cloud computing means renting computing resources on demand instead of buying servers.",
      "IaaS gives you virtual machines, PaaS gives you a managed platform for your code, SaaS is finished software.",
      "Under the shared responsibility model, the provider secures the cloud and you secure what you put in it.",
      "You pay for what you use, so switching off unused resources directly saves money.",
    ],
    [
      "Compute: Virtual Machines, App Service for web apps, Azure Functions for small event-driven code.",
      "Storage: Blob Storage for files, Azure SQL and Azure Database for PostgreSQL for relational data.",
      "Networking: virtual networks, load balancers and Azure Front Door for global traffic.",
      "Regions are physical locations; South Africa North (Johannesburg) keeps data close to local users and supports POPIA.",
    ],
    [
      "Use the Azure Pricing Calculator to estimate costs before you build.",
      "Resource groups organise resources; tags record the owner and project for billing.",
      "Budgets and cost alerts warn you before spending gets out of hand.",
      "Azure Policy enforces rules automatically, for example 'only deploy to South Africa regions'.",
    ],
  ],
  "l-sec": [
    [
      "Injection happens when user input is treated as code, for example SQL built by joining strings.",
      "Always use parameterised queries or an ORM such as Prisma; never concatenate user input into SQL.",
      "Validate every request on the server, even if the browser already checked it: browsers can be bypassed.",
      "Escape output in HTML (React does this by default) to prevent cross-site scripting (XSS).",
    ],
    [
      "Never store plain-text passwords. Hash them with a slow algorithm built for passwords, such as Argon2id or bcrypt.",
      "Give the same error for 'unknown email' and 'wrong password' so attackers can't discover which emails exist.",
      "Rate-limit login attempts to slow down password guessing.",
      "Keep sessions short-lived and revocable; rotate refresh tokens and revoke them on logout.",
    ],
    [
      "Secrets (API keys, database passwords, JWT secrets) must never be committed to Git.",
      "Keep them in environment variables or a secrets manager, and add .env to .gitignore.",
      "Use different secrets for development and production, and rotate them if they ever leak.",
      "Give each service the least access it needs, for example a database user that can't drop tables.",
    ],
  ],
  "l-git": [
    [
      "A branch is an independent line of work. Create one per feature: git checkout -b mentors-page.",
      "Commit small, related changes with clear messages that say what changed and why.",
      "main should always work. Merge a feature into it only when the feature is finished and tested.",
      "git status and git log --oneline show where you are at any time.",
    ],
    [
      "A pull request asks to merge your branch into main and gives teammates a place to review the code.",
      "Keep pull requests small so they are easy to review; describe what changed and how to test it.",
      "Automated checks (CI) run on every pull request and should pass before merging.",
      "Review kindly and specifically: suggest a change and explain why.",
    ],
    [
      "A merge conflict happens when two branches change the same lines. Git marks both versions in the file.",
      "Resolve it by editing the file to the correct final version, removing the <<<<<<< ======= >>>>>>> markers, then commit.",
      "Pull from main often to keep your branch up to date and conflicts small.",
      "git rebase replays your commits on top of main for a cleaner history; never rebase commits others are already using.",
    ],
  ],
};

/** More assessments, so more skills can be verified with a test. */
export const extraAssessments = [
  {
    id: "a-typescript",
    title: "TypeScript Skills Assessment",
    skill: "TypeScript",
    minutes: 10,
    questions: [
      {
        prompt: "What happens to TypeScript types when the code is compiled to JavaScript?",
        options: ["They are checked again at runtime", "They are removed", "They become JSDoc comments", "They slow the app down"],
        answer: 1,
      },
      {
        prompt: "Which type allows only the values 'graduate' or 'employer'?",
        options: ["string", "enum string", "'graduate' | 'employer'", "any"],
        answer: 2,
      },
      {
        prompt: "What does the ? in `email?: string` mean?",
        options: ["The value is a string or a number", "The property may be missing", "The property is read-only", "The value is nullable in the database"],
        answer: 1,
      },
      {
        prompt: "Why validate API responses with a schema (e.g. Zod) even when you have TypeScript types?",
        options: [
          "Types don't exist at runtime, so they can't prove what the server sent",
          "Zod makes requests faster",
          "TypeScript can't type objects",
          "It is required by React",
        ],
        answer: 0,
      },
      {
        prompt: "Which is a generic function signature?",
        options: ["function first(items: any[])", "function first<T>(items: T[]): T", "function first(items): T", "function<T> first(items)"],
        answer: 1,
      },
    ],
  },
  {
    id: "a-python",
    title: "Python Skills Assessment",
    skill: "Python",
    minutes: 10,
    questions: [
      {
        prompt: "What does `len([1, 2, 3])` return?",
        options: ["2", "3", "4", "An error"],
        answer: 1,
      },
      {
        prompt: "Which data type stores key-value pairs?",
        options: ["list", "tuple", "dict", "set"],
        answer: 2,
      },
      {
        prompt: "What is the output of `[x * 2 for x in range(3)]`?",
        options: ["[2, 4, 6]", "[0, 2, 4]", "[0, 1, 2]", "[1, 2, 3]"],
        answer: 1,
      },
      {
        prompt: "Which keyword handles an exception?",
        options: ["catch", "except", "rescue", "error"],
        answer: 1,
      },
      {
        prompt: "What does `with open('data.csv') as f:` guarantee?",
        options: ["The file is read faster", "The file is closed automatically afterwards", "The file is created if missing", "The file is opened read-write"],
        answer: 1,
      },
    ],
  },
  {
    id: "a-git",
    title: "Git Skills Assessment",
    skill: "Git",
    minutes: 10,
    questions: [
      {
        prompt: "Which command creates a new branch and switches to it?",
        options: ["git branch -d feature", "git checkout -b feature", "git merge feature", "git push feature"],
        answer: 1,
      },
      {
        prompt: "What does `git pull` do?",
        options: ["Uploads your commits", "Downloads and merges changes from the remote", "Deletes local changes", "Creates a pull request"],
        answer: 1,
      },
      {
        prompt: "When does a merge conflict happen?",
        options: [
          "When two branches change the same lines differently",
          "When you commit too often",
          "When a branch name is too long",
          "When the remote is offline",
        ],
        answer: 0,
      },
      {
        prompt: "Which file stops node_modules from being committed?",
        options: ["package.json", ".gitignore", ".env", "README.md"],
        answer: 1,
      },
      {
        prompt: "What is a pull request for?",
        options: ["Downloading a repository", "Reviewing and discussing changes before merging them", "Undoing a commit", "Backing up a branch"],
        answer: 1,
      },
    ],
  },
  {
    id: "a-docker",
    title: "Docker Skills Assessment",
    skill: "Docker",
    minutes: 10,
    questions: [
      {
        prompt: "What is a Docker image?",
        options: ["A running container", "A read-only template used to create containers", "A virtual machine", "A screenshot of an app"],
        answer: 1,
      },
      {
        prompt: "Which file describes how to build an image?",
        options: ["docker-compose.yml", "Dockerfile", "package.json", ".dockerignore"],
        answer: 1,
      },
      {
        prompt: "What does `-p 8080:80` do in `docker run -p 8080:80 nginx`?",
        options: [
          "Limits memory to 8080 MB",
          "Maps port 8080 on your computer to port 80 in the container",
          "Starts 80 containers",
          "Sets the process id",
        ],
        answer: 1,
      },
      {
        prompt: "Why use a volume for a database container?",
        options: ["To make it faster", "So the data survives when the container is removed", "To open a port", "To reduce image size"],
        answer: 1,
      },
      {
        prompt: "What is docker compose used for?",
        options: ["Writing Dockerfiles", "Running several related containers together from one file", "Compressing images", "Monitoring CPU usage"],
        answer: 1,
      },
    ],
  },
];
