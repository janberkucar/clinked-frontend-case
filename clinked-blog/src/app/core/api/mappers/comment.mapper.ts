import type { CommentDto } from '../dto/comment.dto';
import type { Comment } from '../../../shared/models/comment.model';
// NOTE(@Janberk): Map method for singular Comment DTO.
export function mapCommentFromDto(dto: CommentDto): Comment {
  return {
    id: dto.id,
    articleId: dto.articleId,
    content: dto.content,
    createdAt: dto.createdAt,
  };
}
// NOTE(@Janberk): Map method for whole array of Comments DTO.
export function mapCommentsFromDto(dtos: readonly CommentDto[]): Comment[] {
  return dtos.map(mapCommentFromDto);
}
