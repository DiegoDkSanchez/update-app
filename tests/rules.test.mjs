import { readFileSync } from "node:fs";
import { test, before, after, beforeEach } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

let env;
const group = {
  title: "Dinner",
  description: "Friday night",
  ownerId: "owner",
  createdAt: 1,
};
const item = {
  name: "Alex",
  purchase: "Pasta",
  amount: 24,
  done: false,
  createdAt: 1,
};
const google = { firebase: { sign_in_provider: "google.com" } };
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-update-app",
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "updateGroups/dinner"), group);
    await setDoc(doc(c.firestore(), "updateGroups/dinner/items/pasta"), item);
  });
});
test("anonymous visitors can read a linked group and its items, but cannot enumerate groups", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "updateGroups/dinner")));
  await assertSucceeds(getDocs(collection(db, "updateGroups/dinner/items")));
  await assertFails(getDocs(collection(db, "updateGroups")));
});
test("Google owner can create groups, query own groups, and manage items", async () => {
  const db = env.authenticatedContext("owner", google).firestore();
  await assertSucceeds(setDoc(doc(db, "updateGroups/new"), group));
  await assertSucceeds(
    getDocs(
      query(collection(db, "updateGroups"), where("ownerId", "==", "owner")),
    ),
  );
  await assertSucceeds(setDoc(doc(db, "updateGroups/dinner/items/new"), item));
  await assertSucceeds(
    updateDoc(doc(db, "updateGroups/dinner/items/pasta"), { done: true }),
  );
  await assertSucceeds(deleteDoc(doc(db, "updateGroups/dinner/items/pasta")));
});
test("anonymous and non-owner mutations are denied, including nested paths", async () => {
  for (const db of [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext("other", google).firestore(),
  ]) {
    await assertFails(setDoc(doc(db, "updateGroups/dinner/items/new"), item));
    await assertFails(
      updateDoc(doc(db, "updateGroups/dinner"), { title: "Hijack" }),
    );
    await assertFails(deleteDoc(doc(db, "updateGroups/dinner/items/pasta")));
    await assertFails(
      setDoc(doc(db, "updateGroups/dinner/unknown/x"), { bad: true }),
    );
  }
});
test("owner impersonation, non-Google creation, and invalid amounts are rejected", async () => {
  const db = env.authenticatedContext("other", google).firestore();
  await assertFails(setDoc(doc(db, "updateGroups/new"), group));
  const owner = env.authenticatedContext("owner", google).firestore();
  await assertFails(
    updateDoc(doc(owner, "updateGroups/dinner"), { ownerId: "other" }),
  );
  await assertFails(
    setDoc(doc(owner, "updateGroups/dinner/items/bad"), {
      ...item,
      amount: -1,
    }),
  );
  await assertFails(
    setDoc(doc(owner, "updateGroups/dinner/items/bad"), {
      ...item,
      amount: 1000001,
    }),
  );
  await assertFails(
    setDoc(
      doc(
        env
          .authenticatedContext("owner", {
            firebase: { sign_in_provider: "password" },
          })
          .firestore(),
        "updateGroups/new",
      ),
      group,
    ),
  );
});
