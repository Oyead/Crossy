import { useSearch } from "@/hooks/useSearch";

interface MatchReasonProps {
  reason: string;
}

export default function MatchReason({ reason }: MatchReasonProps) {
  return (
    <div className="text-sm text-gray-500">
      <span className="font-medium">Why this matches: </span>{reason}
    </div>
  );
}