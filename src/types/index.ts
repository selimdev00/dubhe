export type FetchStatus = "idle" | "loading" | "error" | "ready";

export interface User {
  id: number;
  username: string;
  name?: string;
  posts: Post[];
  status: FetchStatus;
}

export interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
  user?: Pick<User, "username">;
}
