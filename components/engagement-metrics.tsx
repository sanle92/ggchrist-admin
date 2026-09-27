import { Eye, Heart, MessageCircle, Share2 } from "lucide-react";

export function EngagementMetrics({
  likes = 0,
  comments = 0,
  shares = 0,
  views,
}: {
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  views?: number | null;
}) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] font-medium text-admin-muted">
      <span className="inline-flex items-center gap-1">
        <Heart size={12} /> {likes || 0}
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageCircle size={12} /> {comments || 0}
      </span>
      <span className="inline-flex items-center gap-1">
        <Share2 size={12} /> {shares || 0}
      </span>
      {views !== undefined && views !== null ? (
        <span className="inline-flex items-center gap-1">
          <Eye size={12} /> {views}
        </span>
      ) : null}
    </span>
  );
}
