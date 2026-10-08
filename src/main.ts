import { bootstrapApplication } from "@angular/platform-browser";
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  HostListener,
  LOCALE_ID,
} from "@angular/core";
import { CommonModule, registerLocaleData } from "@angular/common";
import localeEsSv from "@angular/common/locales/es-SV";
import { FormsModule } from "@angular/forms";
import {
  LucideAngularModule,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  Check,
  CheckCheck,
  Users,
  LayoutGrid,
  Link,
  LogOut,
  X,
  Pencil,
  Trash2,
  ShoppingBag,
  Search,
  ChevronRight,
  Globe,
  LockKeyhole,
  Utensils,
  Copy,
} from "lucide-angular";
import { DataService, Group, Item } from "./data.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: "./app.html",
})
export class App {
  data = inject(DataService);
  icons = {
    Plus,
    ArrowUpRight,
    ArrowLeft,
    Check,
    CheckCheck,
    Users,
    LayoutGrid,
    Link,
    LogOut,
    X,
    Pencil,
    Trash2,
    ShoppingBag,
    Search,
    ChevronRight,
    Globe,
    LockKeyhole,
    Utensils,
    Copy,
  };
  demo = signal(new URLSearchParams(location.search).has("demo"));
  sharedId = signal(
    location.pathname.startsWith("/g/") ? location.pathname.split("/")[2] : "",
  );
  groups = signal<Group[]>([]);
  group = signal<Group | null>(null);
  items = signal<Item[]>([]);
  loading = signal(false);
  busy = signal(false);
  error = signal("");
  toast = signal("");
  missing = signal(false);
  modal = signal<"group" | "item" | "delete" | "share" | null>(null);
  title = "";
  description = "";
  name = "";
  amount: number | null = null;
  purchase = "";
  editing: Item | null = null;
  filter = signal("all");
  shareUrl = "";
  private itemStop?: () => void;
  private groupStop?: () => void;
  private previousFocus: HTMLElement | null = null;
  owner = computed(() =>
    this.demo()
      ? !this.sharedId()
      : !!this.data.user() && this.group()?.ownerId === this.data.user()?.uid,
  );
  dashboard = computed(
    () => this.demo() || !!this.data.user() || !!this.sharedId(),
  );
  completed = computed(() => this.items().filter((x) => x.done).length);
  total = computed(() => this.items().reduce((sum, x) => sum + x.amount, 0));
  bought = computed(() =>
    this.items()
      .filter((x) => x.done)
      .reduce((sum, x) => sum + x.amount, 0),
  );
  people = computed(
    () => new Set(this.items().map((x) => x.name.toLowerCase())).size,
  );
  visible = computed(() =>
    this.items().filter(
      (x) =>
        this.filter() === "all" ||
        (this.filter() === "done" ? x.done : !x.done),
    ),
  );
  constructor() {
    if (this.demo()) {
      this.loadDemo();
      this.persist();
    }
    effect(() => {
      const open = this.modal();
      if (open) {
        this.previousFocus = document.activeElement as HTMLElement;
        setTimeout(() =>
          document
            .querySelector<HTMLElement>(
              ".modal input, .modal .button, .modal-close",
            )
            ?.focus(),
        );
      } else this.previousFocus?.focus();
    });
    effect((onCleanup) => {
      if (this.demo()) return;
      const id = this.sharedId(),
        user = this.data.user();
      this.error.set("");
      this.groupStop?.();
      this.itemStop?.();
      this.group.set(null);
      this.items.set([]);
      if (id) {
        this.loading.set(true);
        const stop = this.data.group(
          id,
          (g) => {
            this.group.set(g);
            this.missing.set(!g);
            this.loading.set(false);
            if (g) this.watchItems(id);
          },
          (e) => this.fail(e),
        );
        onCleanup(stop);
      } else if (user) {
        this.loading.set(true);
        const stop = this.data.groups(
          user.uid,
          (gs) => {
            this.groups.set(gs);
            this.loading.set(false);
            if (!this.group() && gs.length) this.select(gs[0]);
          },
          (e) => this.fail(e),
        );
        onCleanup(stop);
      } else this.groups.set([]);
    });
  }
  loadDemo() {
    const g: Group = {
      id: "weekend-dinner",
      title: "Cena del viernes",
      description:
        "Buena comida, mejor compañía. Todo para compartir una noche en la mesa.",
      ownerId: "demo",
      createdAt: Date.now(),
    };
    const items: Item[] = [
      {
        id: "1",
        name: "Alex Morgan",
        purchase: "Pasta fresca y pan",
        amount: 24,
        done: true,
        createdAt: 1,
      },
      {
        id: "2",
        name: "Jamie Chen",
        purchase: "Vino para la mesa",
        amount: 32,
        done: true,
        createdAt: 2,
      },
      {
        id: "3",
        name: "Sofia Rivera",
        purchase: "Ensalada y verduras de temporada",
        amount: 18.5,
        done: false,
        createdAt: 3,
      },
      {
        id: "4",
        name: "Chris Taylor",
        purchase: "Algo dulce",
        amount: 22,
        done: false,
        createdAt: 4,
      },
    ];
    try {
      const saved = JSON.parse(localStorage.getItem("update-demo") || "null");
      // Translate only untouched sample content, preserving the user's edits.
      const sample = saved?.groups?.find((group: Group) => group.id === g.id);
      if (sample) {
        if (sample.title === 'Friday dinner club') sample.title = g.title;
        if (sample.description === 'Good food, better company. Everything we need for a night around the table.') sample.description = g.description;
        const previousPurchases = ['Fresh pasta & sourdough', 'Wine for the table', 'Salad & seasonal vegetables', 'Something sweet'];
        for (const item of saved.items?.[g.id] || []) {
          const index = items.findIndex(seed => seed.id === item.id);
          if (index >= 0 && item.purchase === previousPurchases[index]) item.purchase = items[index].purchase;
        }
        localStorage.setItem('update-demo', JSON.stringify(saved));
      }
      this.groups.set(saved?.groups || [g]);
      this.group.set(this.groups()[0] || null);
      this.items.set(saved?.items?.[this.group()?.id || ""] || items);
    } catch {
      this.groups.set([g]);
      this.group.set(g);
      this.items.set(items);
    }
  }
  persist() {
    const saved = JSON.parse(
      localStorage.getItem("update-demo") || '{"items":{}}',
    );
    localStorage.setItem(
      "update-demo",
      JSON.stringify({
        groups: this.groups(),
        items: { ...saved.items, [this.group()!.id]: this.items() },
      }),
    );
  }
  watchItems(id: string) {
    this.itemStop?.();
    this.itemStop = this.data.items(
      id,
      (x) => {
        this.items.set(x);
        this.loading.set(false);
      },
      (e) => this.fail(e),
    );
  }
  select(g: Group) {
    this.group.set(g);
    this.filter.set("all");
    this.items.set([]);
    if (this.demo()) {
      const saved = JSON.parse(
        localStorage.getItem("update-demo") || '{"items":{}}',
      );
      this.items.set(saved.items?.[g.id] || []);
    } else {
      this.loading.set(true);
      this.watchItems(g.id);
    }
  }
  fail(e: unknown) {
    this.loading.set(false);
    const code = (e as { code?: string })?.code;
    const messages: Record<string, string> = {
      "auth/popup-closed-by-user":
        "Se cerró el inicio de sesión. Selecciona Continuar con Google para volver a intentarlo.",
      "auth/popup-blocked":
        "Tu navegador bloqueó la ventana de inicio de sesión. Permite las ventanas emergentes y vuelve a intentarlo.",
      "auth/unauthorized-domain":
        "El inicio de sesión no está habilitado para esta dirección. Usa la aplicación publicada.",
      "auth/network-request-failed":
        "No se pudo conectar. Revisa tu conexión a internet y vuelve a intentarlo.",
      "permission-denied":
        "No tienes permiso para esta acción. Inicia sesión con la cuenta que creó el grupo.",
      unavailable:
        "El servicio no está disponible por el momento. Revisa tu conexión y vuelve a intentarlo.",
    };
    this.error.set(
      messages[code || ""] ||
        "No pudimos completar la solicitud. Vuelve a intentarlo.",
    );
    console.error(e);
  }
  async run(fn: () => Promise<unknown>) {
    this.busy.set(true);
    this.error.set("");
    try {
      await fn();
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  async login() {
    await this.run(async () => {
      await this.data.login();
    });
  }
  async logout() {
    await this.run(async () => {
      await this.data.logout();
      this.group.set(null);
      this.items.set([]);
    });
  }
  preview() {
    location.href = "/?demo=1";
  }
  openGroup() {
    this.title = "";
    this.description = "";
    this.modal.set("group");
  }
  openItem(item?: Item) {
    this.editing = item || null;
    this.name = item?.name || "";
    this.amount = item?.amount ?? null;
    this.purchase = item?.purchase || "";
    this.modal.set("item");
  }
  async create() {
    if (!this.title.trim()) return;
    await this.run(async () => {
      if (this.demo()) {
        const g = {
          id: crypto.randomUUID(),
          title: this.title.trim(),
          description: this.description.trim(),
          ownerId: "demo",
          createdAt: Date.now(),
        };
        this.groups.update((x) => [g, ...x]);
        this.group.set(g);
        this.items.set([]);
        this.persist();
      } else {
        const id = await this.data.create(
          this.title.trim(),
          this.description.trim(),
        );
        this.select({
          id,
          title: this.title.trim(),
          description: this.description.trim(),
          ownerId: this.data.user()!.uid,
          createdAt: Date.now(),
        });
      }
      this.modal.set(null);
      this.notify("Grupo creado");
    });
  }
  async save() {
    if (
      !this.owner() ||
      !this.name.trim() ||
      !this.purchase.trim() ||
      this.amount === null ||
      !Number.isFinite(this.amount) ||
      this.amount < 0 ||
      this.amount > 1000000
    )
      return;
    await this.run(async () => {
      const item: Item = {
        id: this.editing?.id || crypto.randomUUID(),
        name: this.name.trim(),
        purchase: this.purchase.trim(),
        amount: Math.round(this.amount! * 100) / 100,
        done: this.editing?.done || false,
        createdAt: this.editing?.createdAt || Date.now(),
      };
      if (this.demo()) {
        this.items.update((xs) =>
          this.editing
            ? xs.map((x) => (x.id === item.id ? item : x))
            : [...xs, item],
        );
        this.persist();
      } else await this.data.save(this.group()!.id, item);
      this.modal.set(null);
      this.notify("Pago guardado");
    });
  }
  async toggle(item: Item) {
    if (!this.owner()) return;
    await this.run(async () => {
      if (this.demo()) {
        this.items.update((xs) =>
          xs.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)),
        );
        this.persist();
      } else await this.data.toggle(this.group()!.id, item);
    });
  }
  async remove() {
    if (!this.owner() || !this.editing) return;
    await this.run(async () => {
      if (this.demo()) {
        this.items.update((xs) => xs.filter((x) => x.id !== this.editing!.id));
        this.persist();
      } else await this.data.remove(this.group()!.id, this.editing!.id);
      this.modal.set(null);
      this.notify("Pago eliminado");
    });
  }
  share() {
    this.shareUrl = location.origin + "/g/" + this.group()!.id;
    this.modal.set("share");
  }
  async copy() {
    await this.run(async () => {
      await navigator.clipboard.writeText(this.shareUrl);
      this.notify("Enlace copiado");
    });
  }
  notify(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(""), 3500);
  }
  @HostListener("document:keydown.escape") close() {
    if (!this.busy()) this.modal.set(null);
  }
  @HostListener("document:keydown", ["$event"]) trapFocus(
    event: KeyboardEvent,
  ) {
    if (!this.modal() || event.key !== "Tab") return;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".modal button:not([disabled]), .modal input, .modal textarea, .modal a",
      ),
    );
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}
registerLocaleData(localeEsSv);
bootstrapApplication(App, {providers: [{provide: LOCALE_ID, useValue: 'es-SV'}]}).catch(console.error);
