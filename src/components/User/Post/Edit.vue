<script setup lang="ts">
import { Post } from "@/types";
import { Field, Form, ErrorMessage } from "vee-validate";
import { object, string } from "yup";

const props = defineProps(["title", "post"]);
const emit = defineEmits(["close", "edit"]);

const schema = object({
  title: string().required("Название необходимо заполнить"),
  body: string().required("Содержимое необходимо заполнить"),
});

const closeForm = (): void => {
  emit("close");
};

const editPost = (post: unknown): void => {
  emit("edit", post as Post);
};
</script>

<template>
  <section
    class="modal-card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-modal-title"
  >
    <header class="modal-card__head">
      <h2 id="edit-modal-title" class="modal-card__title">{{ props.title }}</h2>
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
      :initial-values="{ id: post.id, title: post.title, body: post.body }"
      @submit="editPost"
    >
      <div class="field">
        <label class="field__label" for="edit-title">Название</label>
        <Field
          id="edit-title"
          name="title"
          placeholder="Краткий заголовок поста"
          aria-describedby="edit-title-error"
        />
        <ErrorMessage id="edit-title-error" name="title" class="field__error" />
      </div>

      <div class="field">
        <label class="field__label" for="edit-body">Содержимое</label>
        <Field
          id="edit-body"
          name="body"
          as="textarea"
          rows="4"
          placeholder="Текст поста…"
          aria-describedby="edit-body-error"
        />
        <ErrorMessage id="edit-body-error" name="body" class="field__error" />
      </div>

      <button class="btn btn--primary modal-card__submit" type="submit">
        Сохранить
      </button>
    </Form>
  </section>
</template>
