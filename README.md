# Update

A responsive Angular app for shared purchase checklists. Google is the only sign-in method. Group creators can add, edit, delete, and check off purchases; anyone with a group link can view live updates without signing in.

## Development

```sh
npm ci
npm start -- --port 4200
```

Open http://localhost:4200. The login page includes a sample workspace at `/?demo=1`; its changes are stored locally and are never advertised as public share links.

## Firebase

- Project: `tasks-2c54f`
- Hosting site: `tasks-2c54f-update` (keeps the existing sites intact)
- Firebase web configuration: `src/firebase.config.ts`
- Data: `updateGroups/{groupId}` and `updateGroups/{groupId}/items/{itemId}`
- Public links: `/g/{groupId}`
- Currency: USD; amounts are rounded to cents.

The Firebase web API key identifies the project and is intentionally public. Access is enforced by Firestore rules. Google sign-in must be enabled, and each deployment hostname must be listed in Firebase Authentication's authorized domains.

The project had unrestricted Firestore rules before this app. The checked-in rules restrict `updateGroups` to public individual reads and creator-only writes, while retaining the existing policy for unrelated collections. Those legacy collections still need their own security review. No existing records are migrated or deleted.

## Verification

```sh
npm run build
npx playwright install chromium
npm run test:e2e
firebase emulators:exec --only firestore --project demo-update-app 'node --test tests/rules.test.mjs'
```

Browser tests require the local server. They cover desktop and mobile layout, group creation, purchase editing, completion filters, deletion, and local preview persistence. Emulator tests cover anonymous reads, owner writes, non-owner denial, and validation. A real Google OAuth session must be completed interactively by the user.

## Deploy

```sh
npm run build -- --configuration production
firebase deploy --only hosting,firestore:rules --project tasks-2c54f
```

Only deploy the rules after reviewing any changes made by other applications in this shared Firebase project. The interface is in Spanish with solid green surfaces and locally bundled fonts. The Google sign-in button retains its identity icon.
