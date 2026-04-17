// Comment Model for Frontend Client Side
export interface Comment {
  readonly id: string;
  readonly articleId: string;
  readonly content: string;
  readonly createdAt: string;
}
