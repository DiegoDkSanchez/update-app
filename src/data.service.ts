import { Injectable, signal } from "@angular/core";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Unsubscribe,
} from "firebase/firestore";
import { firebaseConfig } from "./firebase.config";

export interface Group {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  createdAt: number;
}
export interface Item {
  id: string;
  name: string;
  amount: number;
  purchase: string;
  done: boolean;
  createdAt: number;
}

@Injectable({ providedIn: "root" })
export class DataService {
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  private db = getFirestore(this.app);
  user = signal<User | null>(null);
  ready = signal(false);
  constructor() {
    this.auth.languageCode = 'es';
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.ready.set(true);
    });
  }
  login() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }
  logout() {
    return signOut(this.auth);
  }
  groups(
    uid: string,
    next: (groups: Group[]) => void,
    error: (e: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, "updateGroups"), where("ownerId", "==", uid)),
      (s) =>
        next(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Group)
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      error,
    );
  }
  group(
    id: string,
    next: (group: Group | null) => void,
    error: (e: Error) => void,
  ) {
    return onSnapshot(
      doc(this.db, "updateGroups", id),
      (s) => next(s.exists() ? ({ ...s.data(), id: s.id } as Group) : null),
      error,
    );
  }
  items(id: string, next: (items: Item[]) => void, error: (e: Error) => void) {
    return onSnapshot(
      collection(this.db, "updateGroups", id, "items"),
      (s) =>
        next(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Item)
            .sort((a, b) => a.createdAt - b.createdAt),
        ),
      error,
    );
  }
  async create(title: string, description: string) {
    const ref = doc(collection(this.db, "updateGroups"));
    await setDoc(ref, {
      title,
      description,
      ownerId: this.user()!.uid,
      createdAt: Date.now(),
    });
    return ref.id;
  }
  save(group: string, item: Item) {
    const { id, ...data } = item;
    return setDoc(doc(this.db, "updateGroups", group, "items", id), data);
  }
  toggle(group: string, item: Item) {
    return updateDoc(doc(this.db, "updateGroups", group, "items", item.id), {
      done: !item.done,
    });
  }
  remove(group: string, id: string) {
    return deleteDoc(doc(this.db, "updateGroups", group, "items", id));
  }
}
