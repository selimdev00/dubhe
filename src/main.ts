import { createApp } from "vue";
import { createVfm } from "vue-final-modal";
import App from "./App.vue";
import router from "./router";

import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";

import "./assets/scss/main.scss";
import "vue-final-modal/style.css";

const app = createApp(App);
const vfm = createVfm();

app.use(router);
app.use(vfm);

app.mount("#app");
