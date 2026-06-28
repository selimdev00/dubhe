<script setup lang="ts">
import { Post } from "@/types";
import { Field, Form, ErrorMessage } from "vee-validate";
import { object, string } from "yup";

const props = defineProps(["title", "user"]);
const emit = defineEmits(["close", "add"]);

const schema = object({
  title: string().required("Название необходимо заполнить"),
  body: string().required("Содержимое необходимо заполнить"),
});

const closeForm = (): void => {
  emit("close");
};

const addPost = (post: unknown): void => {
  emit("add", post as Post);
};
</script>

<template>
  <section
    class="modal-card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="add-modal-title"
  >
    <header class="modal-card__head">
      <h2 id="add-modal-title" class="modal-card__title">{{ props.title }}</h2>
      <button
        class="modal-card__close"
        type="button"
        aria-label="Закрыть форму"
        @click="closeForm"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </header>

    <Form
      class="modal-card__form"
      :validation-schema="schema"
      :initial-values="{ userId: user.id }"
      @submit="addPost"
    >
      <div class="field">
        <label class="field__label" for="add-title">Название</label>
        <Field
          id="add-title"
          name="title"
          placeholder="Краткий заголовок поста"
          aria-describedby="add-title-error"
        />
        <ErrorMessage id="add-title-error" name="title" class="field__error" />
      </div>

      <div class="field">
        <label class="field__label" for="add-body">Содержимое</label>
        <Field
          id="add-body"
          name="body"
          as="textarea"
          rows="4"
          placeholder="Текст поста…"
          aria-describedby="add-body-error"
        />
        <ErrorMessage id="add-body-error" name="body" class="field__error" />
      </div>

      <button class="btn btn--primary modal-card__submit" type="submit">
        Добавить пост
      </button>
    </Form>
  </section>
</template>
