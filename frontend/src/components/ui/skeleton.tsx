// components/ui/skeleton.tsx
import React from "react"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // 🚨 animate-pulse が「フワフワ波打つ」Tailwindの魔法のクラスです
      className={`animate-pulse rounded-md bg-gray-200/80 ${className || ""}`}
      {...props}
    />
  )
}