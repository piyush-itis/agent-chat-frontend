import { useQuery } from "@tanstack/react-query";
import { getCredits } from "@/lib/api/credits";

export function useCredits() {
  return useQuery({
    queryKey: ["credits"],
    queryFn: getCredits,
    staleTime: 0,
    refetchInterval: 8_000,
  });
}
