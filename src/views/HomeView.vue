<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useModal, useModalSlot } from "vue-final-modal";
import draggable from "vuedraggable";

import Add from "@/components/User/Post/Add.vue";
import Edit from "@/components/User/Post/Edit.vue";
import UserPost from "@/components/User/Post/index.vue";

import { Post, User } from "@/types";

const API = process.env.VUE_APP_API_HOST;

const users = ref<User[]>([]);
const boardStatus = ref<"loading" | "error" | "ready">("loading");
const announcement = ref("");

/* Client-side ids for posts created in-session (JSONPlaceholder does not persist).
   Negative + decreasing => guaranteed not to collide with real API ids. */
let localId = -1;
const nextLocalId = (): number => localId--;

const userCount = computed(() => users.value.length);
const postCount = computed(() =>
  users.value.reduce((sum, u) => sum + u.posts.length, 0)
);

const announce = (message: string): void => {
  announcement.value = "";
  // Re-assign on next frame so identical consecutive messages still re-announce.
  requestAnimationFrame(() => (announcement.value = message));
};

const truncate = (s: string, n = 32): string =>
  s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;

const loadUserPosts = async (user: User): Promise<void> => {
  user.status = "loading";
  try {
    const res = await fetch(`${API}/users/${user.id}/posts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts: Post[] = await res.json();
    posts.forEach((p) => (p.user = { username: user.username }));
    user.posts = posts;
    user.status = "ready";
  } catch {
    user.posts = [];
    user.status = "error";
  }
};

const fetchUsers = async (): Promise<void> => {
  boardStatus.value = "loading";
  users.value = [];
  try {
    const res = await fetch(`${API}/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: Array<{ id: number; username: string; name?: string }> =
      await res.json();

    users.value = data.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      posts: [],
      status: "loading",
    }));
    boardStatus.value = "ready";

    await Promise.all(users.value.map((u) => loadUserPosts(u)));
  } catch {
    boardStatus.value = "error";
  }
};

const AddPostModal = useModal({
  defaultModelValue: false,
  attrs: {
    clickToClose: true,
    escToClose: true,
    focusTrap: false,
    class: "modal-shell",
    contentClass: "modal-content",
    overlayTransition: "vfm-fade",
    onBeforeClose() {
      document
        .querySelector(".modal-card")
        ?.classList.add("modal-card--leaving");
    },
  },
  slots: {
    default: useModalSlot({
      component: Add,
      attrs: {
        title: "Добавить пост",
        onClose() {
          AddPostModal.close();
        },
      },
    }),
  },
});

const openAddPostModal = (user: User): void => {
  AddPostModal.patchOptions({
    slots: {
      default: useModalSlot({
        component: Add,
        attrs: {
          title: `Новый пост — ${user.username}`,
          user,
          onClose() {
            AddPostModal.close();
          },
          onAdd: (post: Post) => {
            post.id = nextLocalId();
            post.userId = user.id;
            post.user = { username: user.username };
            user.posts.unshift(post);
            AddPostModal.close();
            announce(`Пост добавлен в колонку ${user.username}`);
          },
        },
      }),
    },
  });
  AddPostModal.open();
};

const EditPostModal = useModal({
  defaultModelValue: false,
  attrs: {
    clickToClose: true,
    escToClose: true,
    focusTrap: false,
    class: "modal-shell",
    contentClass: "modal-content",
    overlayTransition: "vfm-fade",
    onBeforeClose() {
      document
        .querySelector(".modal-card")
        ?.classList.add("modal-card--leaving");
    },
  },
  slots: {
    default: useModalSlot({
      component: Edit,
      attrs: {
        title: "Изменить пост",
        post: { id: 0, title: "", body: "", userId: 0 },
        onClose() {
          EditPostModal.close();
        },
      },
    }),
  },
});

const openEditModal = (post: Post): void => {
  EditPostModal.patchOptions({
    slots: {
      default: useModalSlot({
        component: Edit,
        attrs: {
          title: "Изменить пост",
          post,
          onClose() {
            EditPostModal.close();
          },
          onEdit: (newValue: Post) => {
            post.title = newValue.title;
            post.body = newValue.body;
            EditPostModal.close();
            announce("Пост обновлён");
          },
        },
      }),
    },
  });
  EditPostModal.open();
};

const deletePost = (user: User, index: number): void => {
  const [removed] = user.posts.splice(index, 1);
  announce(`Пост «${truncate(removed.title)}» удалён`);
};

/* Keyboard-accessible alternative to drag-and-drop. */
const movePost = (fromUser: User, index: number, toUserId: number): void => {
  const target = users.value.find((u) => u.id === toUserId);
  if (!target || target.id === fromUser.id) return;
  const [post] = fromUser.posts.splice(index, 1);
  post.userId = target.id;
  post.user = { username: target.username };
  target.posts.unshift(post);
  announce(`Пост перемещён к автору ${target.username}`);
};

const handlePostGroupChange = (
  status: { added?: { element: Post } },
  user: User
): void => {
  if (status.added) {
    status.added.element.userId = user.id;
    status.added.element.user = { username: user.username };
    announce(`Пост перемещён к автору ${user.username}`);
  }
};

onMounted(fetchUsers);
</script>

<template>
  <main id="board" class="board">
    <div class="container board__body">
      <header class="board__head">
        <p class="board__eyebrow">Картотека</p>
        <h1 class="board__title">Пользователи</h1>
        <p class="board__subtitle">
          <template v-if="boardStatus === 'ready'">
            {{ userCount }} авторов · {{ postCount }} постов. Перетаскивайте
            карточки между колонками или используйте «Переместить».
          </template>
          <template v-else-if="boardStatus === 'loading'">
            Загружаем картотеку…
          </template>
          <template v-else>Не удалось загрузить данные.</template>
        </p>
      </header>

      <!-- Global error -->
      <div v-if="boardStatus === 'error'" class="board__fault" role="alert">
        <span class="board__fault__glyph" aria-hidden="true">⚠</span>
        <div>
          <p class="board__fault__title">Картотека недоступна</p>
          <p class="board__fault__hint">
            Сервер данных не ответил. Проверьте соединение и попробуйте снова.
          </p>
        </div>
        <button class="btn btn--primary" type="button" @click="fetchUsers">
          Повторить
        </button>
      </div>

      <!-- Board -->
      <div
        v-else
        class="board__scroller"
        role="list"
        aria-label="Колонки авторов"
      >
        <section
          v-for="(user, colIndex) in users"
          :key="`user-${user.id}`"
          class="column"
          :style="{ '--col-i': colIndex }"
          role="listitem"
        >
          <header class="column__tab">
            <h2 class="column__name" :title="user.username">
              {{ user.username }}
            </h2>
            <span
              class="column__count"
              :aria-label="`${user.posts.length} постов`"
            >
              {{ user.posts.length }}
            </span>
          </header>

          <div class="column__track">
            <!-- Loading skeletons -->
            <div
              v-if="user.status === 'loading'"
              class="column__skeletons"
              role="status"
              aria-busy="true"
            >
              <div v-for="n in 3" :key="n" class="skeleton-card">
                <span class="skeleton-line skeleton-line--title"></span>
                <span class="skeleton-line"></span>
                <span class="skeleton-line skeleton-line--short"></span>
              </div>
              <span class="sr-only"
                >Загрузка постов автора {{ user.username }}</span
              >
            </div>

            <!-- Per-user error -->
            <div
              v-else-if="user.status === 'error'"
              class="column__msg column__msg--error"
              role="alert"
            >
              <p>Посты не загрузились</p>
              <button
                class="btn btn--ghost"
                type="button"
                @click="loadUserPosts(user)"
              >
                Повторить
              </button>
            </div>

            <!-- Ready: always-droppable list -->
            <template v-else>
              <draggable
                class="column__list"
                :list="user.posts"
                group="posts"
                item-key="id"
                :animation="240"
                :easing="'cubic-bezier(0.16, 1, 0.3, 1)'"
                ghost-class="card--ghost"
                chosen-class="card--chosen"
                drag-class="card--drag"
                @change="(s) => handlePostGroupChange(s, user)"
              >
                <template #item="{ element, index }">
                  <UserPost
                    :post="element"
                    :users="users"
                    :current-user-id="user.id"
                    @edit-request="() => openEditModal(element)"
                    @delete="() => deletePost(user, index)"
                    @move="(toId) => movePost(user, index, toId)"
                  />
                </template>
              </draggable>

              <div v-if="!user.posts.length" class="column__empty">
                <span class="column__empty__glyph" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                    <rect
                      x="3"
                      y="6"
                      width="14"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.6"
                    />
                    <path
                      d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>
                <p class="column__empty__text">Постов пока нет</p>
                <button
                  class="btn btn--ghost btn--sm"
                  type="button"
                  @click="openAddPostModal(user)"
                >
                  Добавить первый
                </button>
              </div>
            </template>
          </div>

          <button
            class="column__add btn btn--primary"
            type="button"
            :aria-label="`Добавить пост для автора ${user.username}`"
            @click="openAddPostModal(user)"
          >
            <span aria-hidden="true">＋</span> Добавить пост
          </button>
        </section>
      </div>
    </div>

    <footer class="board__foot">
      <div class="board__foot__inner">
        <span class="board__foot__mark" aria-hidden="true">AL</span>
        <p class="board__foot__meta">
          Картотека постов · {{ userCount }} авторов, {{ postCount }} записей
        </p>
        <p class="board__foot__src">
          Данные:
          <a
            href="https://jsonplaceholder.typicode.com"
            target="_blank"
            rel="noopener"
            >JSONPlaceholder</a
          >
        </p>
      </div>
    </footer>

    <div class="sr-only" role="status" aria-live="polite">
      {{ announcement }}
    </div>
  </main>
</template>

<style lang="scss">
.board {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: radial-gradient(
    120% 90% at 50% -10%,
    var(--surface) 0%,
    var(--paper) 55%
  );
  padding-top: var(--sp-7);

  /* head + board scroller stack, filling the space between top and footer */
  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  &__head {
    margin-bottom: var(--sp-6);
    animation: board-head-in 0.5s var(--ease-out-expo) both;
  }

  &__eyebrow {
    font-size: var(--t-meta);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent-strong);
    font-weight: 600;
    margin-bottom: var(--sp-2);
  }

  &__title {
    font-size: var(--t-display);
    letter-spacing: -0.015em;
    font-variation-settings: "opsz" 144, "SOFT" 0, "WONK" 1;
  }

  &__subtitle {
    margin-top: var(--sp-3);
    max-width: 62ch;
    color: var(--ink-muted);
    font-size: var(--t-body);
    line-height: 1.55;
  }

  /* Horizontal card-catalog drawer */
  &__scroller {
    display: flex;
    gap: var(--sp-4);
    overflow-x: auto;
    overflow-y: hidden;
    padding: var(--sp-2) 0 var(--sp-4);
    scroll-snap-type: x proximity;
    flex: 1;
    min-height: 0;
  }

  &__fault {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    flex-wrap: wrap;
    padding: var(--sp-6);
    margin-bottom: var(--sp-7);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-card);
    box-shadow: var(--sh-md);

    &__glyph {
      font-size: 1.5rem;
      color: var(--danger);
      flex-shrink: 0;
    }
    &__title {
      font-weight: 600;
      color: var(--ink);
    }
    &__hint {
      font-size: var(--t-body);
      color: var(--ink-muted);
      margin-top: 2px;
    }
    button {
      margin-left: auto;
    }
  }

  &__foot {
    flex-shrink: 0;
    border-top: 1px solid var(--hairline);
    background: var(--surface-sunken);

    &__inner {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      flex-wrap: wrap;
      width: 100%;
      max-width: 1430px;
      margin: 0 auto;
      padding: var(--sp-6) var(--sp-5);
    }

    &__mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: var(--accent);
      color: var(--ink-on-accent);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 0.8rem;
      letter-spacing: 0.02em;
    }

    &__meta {
      font-size: var(--t-meta);
      color: var(--ink-muted);
    }
    &__src {
      margin-left: auto;
      font-size: var(--t-meta);
      color: var(--ink-muted);

      a {
        color: var(--accent-strong);
        text-decoration: none;
        border-bottom: 1px solid var(--accent-tint);
        transition: border-color var(--dur-micro) var(--ease-out-expo);
      }
      a:hover {
        border-bottom-color: var(--accent-strong);
      }
    }
  }
}

@keyframes board-head-in {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes column-in {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* Column = file folder */
.column {
  flex: 0 0 290px;
  width: 290px;
  display: flex;
  flex-direction: column;
  scroll-snap-align: start;
  animation: column-in var(--dur-reveal) var(--ease-out-expo) both;
  animation-delay: calc(var(--col-i, 0) * 55ms);

  &:hover &__tab::after {
    opacity: 1;
    left: var(--sp-3);
    right: var(--sp-3);
  }

  &__tab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-bottom: none;
    border-radius: var(--r-card) var(--r-card) 0 0;
    box-shadow: var(--sh-sm);
    position: relative;
    z-index: 2;

    /* accent rule that reads as a hanging folder tab */
    &::after {
      content: "";
      position: absolute;
      left: var(--sp-4);
      right: var(--sp-4);
      bottom: -1px;
      height: 2px;
      background: var(--accent);
      border-radius: var(--r-pill);
      opacity: 0.55;
      transition: opacity var(--dur-micro) var(--ease-out-expo),
        left var(--dur-micro) var(--ease-out-expo),
        right var(--dur-micro) var(--ease-out-expo);
    }
  }

  &__name {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__count {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: var(--t-meta);
    color: var(--ink-muted);
    background: var(--chip-bg);
    border-radius: var(--r-pill);
    padding: 2px 10px;
    min-width: 28px;
    text-align: center;
  }

  &__track {
    position: relative;
    flex: 1;
    min-height: 0;
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: 0 0 var(--r-card) var(--r-card);
    padding: var(--sp-3);
    overflow-y: auto;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-height: 90px;
  }

  &__skeletons {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  &__empty {
    position: absolute;
    inset: var(--sp-3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    text-align: center;
    border: 1.5px dashed var(--hairline);
    border-radius: var(--r-ctrl);
    color: var(--ink-muted);
    pointer-events: none;

    .btn {
      pointer-events: auto;
    }

    &__glyph {
      color: var(--accent);
      opacity: 0.85;
    }
    &__text {
      font-size: var(--t-body);
    }
  }

  &__msg {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-5) var(--sp-3);
    text-align: center;
    color: var(--ink-muted);
    font-size: var(--t-body);

    &--error {
      color: var(--danger);
    }
  }

  &__add {
    margin-top: var(--sp-3);
    width: 100%;
  }
}

/* Skeletons */
.skeleton-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  padding: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.skeleton-line {
  height: 10px;
  border-radius: var(--r-pill);
  background: linear-gradient(
    90deg,
    var(--surface-sunken) 0%,
    var(--hairline) 50%,
    var(--surface-sunken) 100%
  );
  background-size: 220% 100%;
  animation: ledger-shimmer 1.4s var(--ease-out-expo) infinite;

  &--title {
    height: 13px;
    width: 75%;
  }
  &--short {
    width: 55%;
  }
}

/* Drag affordances */
.card--ghost {
  opacity: 0.4;
}
.card--ghost .post {
  border: 1.5px dashed var(--accent);
  background: var(--accent-tint);
}
.card--chosen .post {
  box-shadow: var(--sh-lift);
}
.card--drag .post {
  transform: rotate(-1.5deg);
}

/* Mobile: stack the drawer into a single column and let the page scroll. */
@media (max-width: 767px) {
  .board {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
    padding-top: var(--sp-6);
  }
  .board__body {
    display: block;
  }
  .board__scroller {
    flex-direction: column;
    overflow-x: visible;
    overflow-y: visible;
    gap: var(--sp-5);
  }
  .column {
    flex: 1 1 auto;
    width: 100%;
  }
  .column__track {
    flex: initial;
    min-height: 0;
    overflow-y: visible;
  }
}
</style>
