import { Card, CardContent } from "./card";
import { Skeleton } from "./skeleton";
import { cn } from "./utils";

interface PostSkeletonProps {
  /** 표시할 스켈레톤 개수 */
  count?: number;
  /** 추가 클래스명 */
  className?: string;
  /** 간격 */
  spacing?: "compact" | "normal" | "relaxed";
}

/**
 * 게시글 카드 로딩 스켈레톤
 */
export function PostSkeleton({
  count = 3,
  className,
  spacing = "normal",
}: PostSkeletonProps) {
  const spacingClasses = {
    compact: "space-y-2",
    normal: "space-y-3",
    relaxed: "space-y-4",
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeletonItem key={index} />
      ))}
    </div>
  );
}

/**
 * 단일 게시글 스켈레톤 아이템
 */
export function PostSkeletonItem({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Avatar + Author + Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Title */}
          <Skeleton className="h-5 w-3/4" />

          {/* Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          {/* Footer: Stats */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-3 w-6" />
              </div>
              <div className="flex items-center space-x-1">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-3 w-6" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 댓글 스켈레톤
 */
export function ReplySkeleton({
  count = 2,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-start space-x-2">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center space-x-3 pt-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 리스트 스켈레톤 (간단한 버전)
 */
export function ListSkeleton({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center space-x-3 p-3 bg-card rounded-lg"
        >
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 검색 결과 스켈레톤
 */
export function SearchResultSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 프로필 스켈레톤
 */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * 그리드 스켈레톤
 */
export function GridSkeleton({
  count = 6,
  columns = 2,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridClasses = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-3">
            <Skeleton className="h-24 w-full mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 테이블 스켈레톤
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4 p-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
