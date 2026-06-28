<script lang="ts" setup>
import { computed, ref } from "vue";
import { Post, User } from "@/types";

const props = defineProps<{
  post: Post;
  users: User[];
  currentUserId: number;
}>();
const emit = defineEmits(["editRequest", "delete", "move"]);

const moving = ref(false);
const moveTargets = computed(() =>
  props.users.filter((u) => u.id !== props.currentUserId)
);

const requestEdit = (): void => {
  emit("editRequest");
};

const deletePost = (): void => {
  emit("delete", props.post);
};

const onMoveSelect = (event: Event): void => {
  const value = Number((event.target as HTMLSelectElement).value);
  if (value) {
    emit("move", value);
    moving.value = false;
  }
};
</script>

<template>
  <article class="post">
    <h3 class="post__title">{{ post.title }}</h3>
    <p class="post__body">{{ post.body }}</p>

    <div class="post__panel">
      <button
        class="btn btn--ghost btn--sm"
        type="button"
        :aria-label="`Изменить пост: ${post.title}`"
        @click="requestEdit"
      >
        Изменить
      </button>
      <button
        class="btn btn--danger btn--sm"
        type="button"
        :aria-label="`Удалить пост: ${post.title}`"
        @click="deletePost"
      >
        Удалить
      </button>
    </div>

    <div v-if="moveTargets.length" class="post__move">
      <button
        v-if="!moving"
        class="post__move__toggle"
        type="button"
        @click="moving = true"
      >
        <span aria-hidden="true">⇄</span> Переместить
      </button>
      <label v-else class="post__move__picker">
        <span class="sr-only">Переместить пост к автору</span>
        <select autofocus @change="onMoveSelect" @blur="moving = false">
          <option value="" selected disabled>Выберите автора…</option>
          <option v-for="u in moveTargets" :key="u.id" :value="u.id">
            {{ u.username }}
          </option>
        </select>
      </label>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.post {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  padding: var(--sp-3) var(--sp-4);
  box-shadow: var(--sh-sm);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  cursor: grab;
  transition: box-shadow var(--dur-micro) var(--ease-out-expo),
    transform var(--dur-micro) var(--ease-out-expo),
    border-color var(--dur-micro) var(--ease-out-expo);

  &:hover {
    box-shadow: var(--sh-md);
    transform: translateY(-3px);
    border-color: var(--accent);
  }
  &:active {
    cursor: grabbing;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--t-card);
    font-weight: 600;
    line-height: 1.3;
    color: var(--ink);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__body {
    font-size: var(--t-body);
    line-height: 1.5;
    color: var(--ink-muted);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__panel {
    display: flex;
    gap: var(--sp-2);
    margin-top: var(--sp-1);

    .btn {
      flex: 1;
    }
  }

  &__move {
    margin-top: 2px;

    &__toggle {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--ink-muted);
      font-size: var(--t-meta);
      padding: var(--sp-1) 0;
      cursor: pointer;
      border-radius: 6px;
      transition: color var(--dur-micro) var(--ease-out-expo);

      &:hover {
        color: var(--accent-strong);
      }
    }

    &__picker select {
      width: 100%;
      font-size: var(--t-meta);
      padding: var(--sp-2);
      border: 1px solid var(--hairline);
      border-radius: var(--r-ctrl);
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
    }
  }
}
</style>
